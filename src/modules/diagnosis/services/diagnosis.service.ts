import { HttpResponse } from 'mvc-common-toolkit';
import { Repository } from 'typeorm';

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { AiModelService } from '@modules/ai-model/ai-model.service';
import { AiService } from '@modules/ai-model/ai.service';
import { FileService } from '@modules/cloudinary/file.service';
import { DiseaseService } from '@modules/disease/services/disease.service';
import { LocationService } from '@modules/geo-context/services/location.service';
import { WeatherService } from '@modules/geo-context/services/weather.service';
import { NutritionService } from '@modules/nutrition/nutrition.service';
import { StorageService, StorageType } from '@modules/storage/storage.service';
import { SystemConfigService } from '@modules/system-config/system-config.service';
import { UserFieldService } from '@modules/user/services/user-field.service';

import { getStorageFolder } from '@shared/constants';
import { SYSTEM_CONFIG_KEY } from '@shared/enums';
import { getVietnameseDiseaseName } from '@shared/helpers/disease.helper';
import {
  generateNotFoundResult,
  generateSuccessResult,
} from '@shared/helpers/operation-result.helper';
import { BaseCRUDService } from '@shared/services/base-crud.service';

import { CreateDiagnosisDto, GetHistoryDto } from '../diagnosis.dto';
import { DiagnosisResult } from '../entities/diagnosis-result.entity';
import { Diagnosis } from '../entities/diagnosis.entity';
import { DiagnosisResultService } from './diagnosis-result.service';

@Injectable()
export class DiagnosisService extends BaseCRUDService<Diagnosis> {
  private readonly logger = new Logger(DiagnosisService.name);

  constructor(
    @InjectRepository(Diagnosis)
    diagnosisRepo: Repository<Diagnosis>,
    private readonly diagnosisResultService: DiagnosisResultService,
    private readonly storageService: StorageService,
    private readonly fileService: FileService,
    private readonly aiModelService: AiModelService,
    private readonly aiService: AiService,
    private readonly diseaseService: DiseaseService,
    private readonly nutritionService: NutritionService,
    private readonly userFieldService: UserFieldService,
    private readonly systemConfigService: SystemConfigService,
    private readonly locationService: LocationService,
    private readonly weatherService: WeatherService,
  ) {
    super(diagnosisRepo);
  }

  async createDiagnosis(
    userId: string,
    dto: CreateDiagnosisDto,
    file: Express.Multer.File,
  ): Promise<HttpResponse<any>> {
    this.logger.log(`Processing diagnosis for user ${userId}`);

    // 0. Validate image size
    await this.fileService.validateImageSize(file);

    // 1. Upload original image to Cloudinary/Storage
    const originalImageUrl = await this.storageService.uploadFile(
      file,
      getStorageFolder().DIAGNOSES,
      StorageType.CLOUDINARY,
    );

    // 2. Get Active AI Model
    let activeModel;
    if (dto.modelVersionId) {
      const modelResult = await this.aiModelService.findById(
        dto.modelVersionId,
      );
      if (!modelResult.success) {
        throw new BadRequestException(
          'Mô hình này không tồn tại trong hệ thống',
        );
      }
      activeModel = modelResult.data;
      if (!activeModel.isActive) {
        throw new BadRequestException('Mô hình này không còn hoạt động');
      }
    } else {
      const activeModelResult = await this.aiModelService.getActiveModel();
      if (!activeModelResult.success || !activeModelResult.data) {
        throw new InternalServerErrorException(
          'Hệ thống hiện chưa có mô hình AI nào khả dụng. Vui lòng liên hệ quản trị viên.',
        );
      }
      activeModel = activeModelResult.data;
    }

    // Resolve coordinates from UserField if fieldId is provided
    if (dto.fieldId) {
      const field = await this.userFieldService.findOne({
        id: dto.fieldId,
        userId,
      });
      if (field) {
        dto.gpsLat = field.gpsLat ? Number(field.gpsLat) : undefined;
        dto.gpsLng = field.gpsLng ? Number(field.gpsLng) : undefined;
      }
    }

    // 2.5 Perform Reverse Geocoding on Backend
    let geocodedProvince = null;
    if (dto.gpsLat !== undefined && dto.gpsLng !== undefined) {
      geocodedProvince = await this.locationService.reverseGeocode(
        dto.gpsLat,
        dto.gpsLng,
      );
    }

    // 2.7 Fetch Weather on NestJS (Orchestrator)
    let weatherData = null;
    if (dto.gpsLat !== undefined && dto.gpsLng !== undefined) {
      weatherData = await this.weatherService.getWeather(
        dto.gpsLat,
        dto.gpsLng,
      );
    } else {
      this.logger.warn(
        'Coordinates are missing for weather API — using default weather',
      );
      weatherData = {
        humidity: 75.0,
        temperature: 28.0,
        rainfall: 'none',
        wind: 'calm',
        source: 'default',
      } as any;
    }

    // Fetch dynamic AI prediction parameters
    const confidenceThresholdStr = await this.systemConfigService.get(
      SYSTEM_CONFIG_KEY.CONFIDENCE_THRESHOLD,
    );
    const confidenceThreshold = confidenceThresholdStr
      ? Number(confidenceThresholdStr)
      : 0.75;

    // 3. Call AI Microservice for prediction using AiService sanity gate
    const aiResponseData = await this.aiService.predict(
      {
        imageUrl: originalImageUrl,
        gpsLat: dto.gpsLat,
        gpsLng: dto.gpsLng,
        province: geocodedProvince,
        fieldParams: dto.fieldParams,
        weather: weatherData,
        confidenceThreshold,
        modelVersionName: activeModel.versionName,
      },
      activeModel.id,
    );

    const { detections, annotated_image, env_adjustment } = aiResponseData;

    // 4. Upload annotated result image to Cloudinary/Storage
    let resultImageUrl = null;
    if (annotated_image) {
      resultImageUrl = await this.storageService.uploadBase64Image(
        annotated_image,
        getStorageFolder().DIAGNOSES_RESULTS,
        StorageType.CLOUDINARY,
      );
    }

    // 5. Create Diagnosis Record
    const savedDiagnosis = await this.create({
      userId,
      originalImageUrl,
      resultImageUrl,
      gpsLat: dto.gpsLat,
      gpsLng: dto.gpsLng,
      province: geocodedProvince,
      envDescription: dto.envDescription,
      fieldDescription: dto.fieldDescription,
      fieldParams: dto.fieldParams,
      modelVersionId: activeModel.id,
      weatherData: env_adjustment?.weather || null,
      fieldId: dto.fieldId || null,
    });

    // 6. Save Individual Results
    let diagnosisResults: DiagnosisResult[] = [];
    const diagnosisResultsData: Partial<DiagnosisResult>[] = [];

    const aiClassNames = Array.from(
      new Set(
        (detections || [])
          .map((pred: any) => pred.disease || pred.class_name)
          .filter(Boolean),
      ),
    ) as string[];

    const matchingDiseases =
      aiClassNames.length > 0
        ? await this.diseaseService.findByAiClassNames(aiClassNames)
        : [];

    const diseaseMap = new Map<string, any>();
    for (const d of matchingDiseases) {
      diseaseMap.set(d.aiClassName, d);
    }

    // Warn if any YOLO detection class has no matching disease in DB (allowing graceful degradation)
    for (const className of aiClassNames) {
      if (!diseaseMap.has(className)) {
        this.logger.warn(
          `Graceful degradation: YOLO class_name "${className}" has no matching ai_class_name in the diseases database.`,
        );
      }
    }

    for (const pred of detections || []) {
      const className = pred.disease || pred.class_name;
      if (!className) continue;

      const disease = diseaseMap.get(className);
      if (!disease) continue; // Skip since there is no matching disease in the DB

      diagnosisResultsData.push({
        diagnosisId: savedDiagnosis.id,
        diseaseId: disease.id,
        confidence: pred.confidence,
        maskPolygon: pred.box || pred.polygon,
        color: pred.color,
        affectedAreaRatio: pred.affected_area_ratio || 0.0,
      });
    }

    if (diagnosisResultsData.length > 0) {
      diagnosisResults =
        await this.diagnosisResultService.bulkCreate(diagnosisResultsData);
    }

    // 7. Generate RAG Advisory for the detected diseases
    let advisory = null;
    let diseaseName = 'Lúa khỏe mạnh / Không rõ bệnh';
    let confidence =
      detections && detections.length > 0 ? detections[0].confidence : 0.95;
    if (diagnosisResults.length > 0) {
      // Sort results by affectedAreaRatio descending, then confidence descending
      const sortedResults = [...diagnosisResults].sort(
        (a, b) =>
          (Number(b.affectedAreaRatio) || 0) -
            (Number(a.affectedAreaRatio) || 0) ||
          Number(b.confidence) - Number(a.confidence),
      );
      const topResult = sortedResults[0];
      confidence = Number(topResult.confidence);

      // Get disease details for all results
      const diseasesInfo = [];
      for (const res of sortedResults) {
        const diseaseResult = await this.diseaseService.findById(res.diseaseId);
        if (diseaseResult.success) {
          diseasesInfo.push({
            name: diseaseResult.data.name,
            scientificName: diseaseResult.data.scientificName || '',
            confidence: Number(res.confidence),
            affectedAreaRatio: Number(res.affectedAreaRatio || 0.0),
            id: res.id,
          });
        }
      }

      if (diseasesInfo.length > 0) {
        diseaseName = diseasesInfo.map((d) => d.name).join(' & ');
        // Structured environmental & field RAG Context prompt
        let ragEnvContext = '';
        if (dto.envDescription) {
          ragEnvContext += `[Bối cảnh Môi trường]: ${dto.envDescription}\n`;
        }
        if (dto.fieldDescription) {
          ragEnvContext += `[Tình trạng Thực địa]: ${dto.fieldDescription}\n`;
        }
        if (dto.fieldParams) {
          const fp = dto.fieldParams;
          const fpStr = `[Thông số đồng ruộng: Nước: ${fp.water || 'Bình thường'}, Giai đoạn: ${fp.growth || 'Đẻ nhánh'}, Mật độ: ${fp.density || 'Vừa'}, Sương mù: ${fp.fog ? 'Có' : 'Không'}, Rầy nâu: ${fp.leafhopper ? 'Có' : 'Không'}, Phun thuốc gần đây: ${fp.pesticide ? 'Có' : 'Không'}]`;
          ragEnvContext += fpStr;
        }
        ragEnvContext = ragEnvContext.trim();

        const advisoryResult = await this.nutritionService.getAdvisory(
          diseasesInfo,
          ragEnvContext,
        );
        if (advisoryResult.success) {
          advisory = advisoryResult.data;
          // Persist advisory to the top result
          await this.diagnosisResultService.updateByID(topResult.id, {
            advisory: advisory.advisory,
          });
        }
      }
    }

    // Determine severity
    let severity = 'medium';
    if (
      advisory &&
      advisory.advisory &&
      advisory.advisory.severity_assessment
    ) {
      const sevText = advisory.advisory.severity_assessment.toLowerCase();
      if (sevText.includes('cấp bách') || sevText.includes('critical'))
        severity = 'critical';
      else if (sevText.includes('nghiêm trọng') || sevText.includes('high'))
        severity = 'high';
      else if (sevText.includes('nhẹ') || sevText.includes('low'))
        severity = 'low';
    } else if (diseaseName === 'Lúa khỏe mạnh / Không rõ bệnh') {
      severity = 'low';
    } else if (confidence > 0.8) {
      severity = 'high';
    }

    const mappedDetections = (detections || []).map((pred) => {
      const className = pred.disease || pred.class_name;
      const disease = className ? diseaseMap.get(className) : null;
      return {
        disease: disease
          ? disease.name
          : getVietnameseDiseaseName(className) ||
            className ||
            'Lúa khỏe mạnh / Không rõ bệnh',
        confidence: pred.confidence,
        color: pred.color,
        affectedAreaRatio: pred.affected_area_ratio || 0.0,
      };
    });

    if (mappedDetections.length === 0) {
      mappedDetections.push({
        disease: 'Lúa khỏe mạnh / Không rõ bệnh',
        confidence,
        color: null,
      } as any);
    }

    return generateSuccessResult({
      // Entity fields
      ...savedDiagnosis,
      results: mappedDetections,
      advisory,

      // Enriched DiagnoseResult fields
      disease_key: diseaseName,
      disease_name: advisory?.advisory?.disease_name || diseaseName,
      confidence,
      severity,
      detections: mappedDetections,
      rag_recommendation: advisory?.advisory || null,
      annotated_image: resultImageUrl || originalImageUrl,
      low_confidence: confidence < 0.75,
      latency_ms: 450,
      env_adjustment,
    });
  }

  async getUserHistory(
    userId: string,
    dto: GetHistoryDto,
  ): Promise<HttpResponse<any>> {
    const limit = dto.limit ? Number(dto.limit) : 10;
    const offset = dto.offset ? Number(dto.offset) : 0;

    const query = this.model
      .createQueryBuilder('diagnosis')
      .leftJoinAndSelect('diagnosis.results', 'result')
      .leftJoinAndSelect('result.disease', 'disease')
      .leftJoinAndSelect('diagnosis.feedbacks', 'feedback')
      .where('diagnosis.userId = :userId', { userId });

    if (dto.fromDate) {
      query.andWhere('diagnosis.createdAt >= :fromDate', {
        fromDate: new Date(dto.fromDate),
      });
    }

    if (dto.toDate) {
      const toDate = new Date(dto.toDate);
      toDate.setHours(23, 59, 59, 999);
      query.andWhere('diagnosis.createdAt <= :toDate', { toDate });
    }

    if (dto.disease && dto.disease !== 'Tất cả') {
      if (dto.disease === 'Khỏe mạnh') {
        query.andWhere('result.id IS NULL');
      } else {
        query.andWhere('disease.name ILIKE :disease', {
          disease: `%${dto.disease}%`,
        });
      }
    }

    if (dto.feedbackStatus && dto.feedbackStatus !== 'Tất cả') {
      if (dto.feedbackStatus === 'Đã gửi phản hồi') {
        query.andWhere('feedback.id IS NOT NULL');
      } else if (dto.feedbackStatus === 'Chờ phản hồi') {
        query.andWhere('feedback.status = :fStatus', { fStatus: 'PENDING' });
      } else if (dto.feedbackStatus === 'Đã duyệt') {
        query.andWhere('feedback.status = :fStatus', { fStatus: 'ACCEPTED' });
      } else if (dto.feedbackStatus === 'Đã từ chối') {
        query.andWhere('feedback.status = :fStatus', { fStatus: 'REJECTED' });
      } else if (dto.feedbackStatus === 'Chưa gửi phản hồi') {
        query.andWhere('feedback.id IS NULL');
      }
    }

    if (dto.keyword) {
      if (dto.keyword.toLowerCase().includes('khỏe mạnh')) {
        query.andWhere(
          '(disease.name ILIKE :keyword OR diagnosis.envDescription ILIKE :keyword OR diagnosis.fieldDescription ILIKE :keyword OR result.id IS NULL)',
          { keyword: `%${dto.keyword}%` },
        );
      } else {
        query.andWhere(
          '(disease.name ILIKE :keyword OR diagnosis.envDescription ILIKE :keyword OR diagnosis.fieldDescription ILIKE :keyword)',
          { keyword: `%${dto.keyword}%` },
        );
      }
    }

    if (dto.sort) {
      const orderDirection = dto.sort.startsWith('-') ? 'DESC' : 'ASC';
      const sortField = dto.sort.replace(/^[+-]/, '');
      query.orderBy(`diagnosis.${sortField}`, orderDirection);
    } else {
      query.orderBy('diagnosis.createdAt', 'DESC');
    }

    const [items, total] = await query
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return generateSuccessResult({
      rows: items,
      total,
      limit,
      offset,
    });
  }

  async getById(id: string): Promise<HttpResponse<any>> {
    const diagnosis = await this.findOne(
      { id },
      {
        relations: {
          results: {
            disease: true,
          },
          aiModel: true,
        },
      },
    );

    if (!diagnosis) return generateNotFoundResult(`Diagnosis ${id} not found`);

    const results = diagnosis.results || [];
    let advisory = null;
    let diseaseName = 'Lúa khỏe mạnh / Không rõ bệnh';
    let confidence = 0.95;

    if (results.length > 0) {
      const sortedResults = [...results].sort(
        (a, b) =>
          (Number(b.affectedAreaRatio) || 0) -
            (Number(a.affectedAreaRatio) || 0) ||
          Number(b.confidence) - Number(a.confidence),
      );
      const topResult = sortedResults[0];
      confidence = Number(topResult.confidence);

      if (topResult.advisory) {
        // Use persisted advisory
        advisory = { advisory: topResult.advisory };
        if (topResult.disease) {
          diseaseName = topResult.disease.name;
        }
      } else if (topResult.disease) {
        // Fallback for old records or failed persistence
        diseaseName = topResult.disease.name;
        const diseasesInfo = [];
        for (const res of sortedResults) {
          if (res.disease) {
            diseasesInfo.push({
              name: res.disease.name,
              confidence: Number(res.confidence),
              affectedAreaRatio: Number(res.affectedAreaRatio || 0.0),
              id: res.id,
            });
          }
        }
        const advisoryResult = await this.nutritionService.getAdvisory(
          diseasesInfo,
          diagnosis.envDescription,
        );
        advisory = advisoryResult.success ? advisoryResult.data : null;
      }
    }

    // Determine severity
    let severity = 'medium';
    if (
      advisory &&
      advisory.advisory &&
      advisory.advisory.severity_assessment
    ) {
      const sevText = advisory.advisory.severity_assessment.toLowerCase();
      if (sevText.includes('cấp bách') || sevText.includes('critical'))
        severity = 'critical';
      else if (sevText.includes('nghiêm trọng') || sevText.includes('high'))
        severity = 'high';
      else if (sevText.includes('nhẹ') || sevText.includes('low'))
        severity = 'low';
    } else if (diseaseName === 'Lúa khỏe mạnh / Không rõ bệnh') {
      severity = 'low';
    } else if (confidence > 0.8) {
      severity = 'high';
    }

    const mappedDetections = results.map((res) => ({
      disease: res.disease ? res.disease.name : 'Lúa khỏe mạnh / Không rõ bệnh',
      confidence: Number(res.confidence),
      color: res.color,
      maskPolygon: res.maskPolygon,
      affectedAreaRatio: Number(res.affectedAreaRatio || 0.0),
    }));

    if (mappedDetections.length === 0) {
      mappedDetections.push({
        disease: 'Lúa khỏe mạnh / Không rõ bệnh',
        confidence,
        color: null,
        maskPolygon: null,
        affectedAreaRatio: 0.0,
      } as any);
    }

    return generateSuccessResult({
      ...diagnosis,
      results: mappedDetections,
      advisory,
      disease_key: diseaseName,
      disease_name: advisory?.advisory?.disease_name || diseaseName,
      confidence,
      severity,
      detections: mappedDetections,
      rag_recommendation: advisory?.advisory || null,
      annotated_image: diagnosis.resultImageUrl || diagnosis.originalImageUrl,
      low_confidence: confidence < 0.75,
      latency_ms: 350,
    });
  }

  async addSupplementaryImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<HttpResponse<any>> {
    this.logger.log(`Processing supplementary image for diagnosis ${id}`);

    const diagnosis = await this.findOne(
      { id },
      {
        relations: {
          results: {
            disease: true,
          },
          aiModel: true,
        },
      },
    );

    if (!diagnosis) {
      throw new NotFoundException(
        `Không tìm thấy kết quả chẩn đoán với ID ${id}`,
      );
    }

    // Validate image size
    await this.fileService.validateImageSize(file);

    // Upload close-up supplementary image to Cloudinary/Storage
    const supplementImageUrl = await this.storageService.uploadFile(
      file,
      getStorageFolder().DIAGNOSES,
      StorageType.CLOUDINARY,
    );

    // Map original results to YOLO class names or fallback to names
    const originalResults = (diagnosis.results || []).map((res) => ({
      disease: res.disease
        ? res.disease.aiClassName || res.disease.name
        : 'Healthy',
      confidence: Number(res.confidence),
    }));

    // Call Python AI microservice re-score API
    const modelVersionName = diagnosis.aiModel
      ? diagnosis.aiModel.versionName
      : undefined;
    const reScoreRes = await this.aiService.reScore({
      originalResults,
      newImageUrl: supplementImageUrl,
      modelVersionName,
    });

    const { detections, annotated_image } = reScoreRes;

    // Upload annotated supplementary image (or fallback to raw supplementary image if AI doesn't return one)
    let finalSupplementImageUrl = supplementImageUrl;
    if (annotated_image) {
      finalSupplementImageUrl = await this.storageService.uploadBase64Image(
        annotated_image,
        getStorageFolder().DIAGNOSES_RESULTS,
        StorageType.CLOUDINARY,
      );
    }

    // Xóa toàn bộ DiagnosisResult cũ
    await this.diagnosisResultService.hardDeleteByID(id);

    // Tạo các DiagnosisResult mới
    const aiClassNames = Array.from(
      new Set(
        (detections || []).map((pred: any) => pred.disease).filter(Boolean),
      ),
    ) as string[];

    const matchingDiseases =
      aiClassNames.length > 0
        ? await this.diseaseService.findByAiClassNames(aiClassNames)
        : [];

    const diseaseMap = new Map<string, any>();
    for (const d of matchingDiseases) {
      diseaseMap.set(d.aiClassName, d);
    }

    const diagnosisResultsData: Partial<DiagnosisResult>[] = [];
    for (const pred of detections || []) {
      const className = pred.disease;
      if (!className) continue;

      const disease = diseaseMap.get(className);
      if (!disease) continue;

      diagnosisResultsData.push({
        diagnosisId: id,
        diseaseId: disease.id,
        confidence: pred.confidence,
        maskPolygon: pred.box || pred.polygon,
        color: pred.color,
        affectedAreaRatio: pred.affected_area_ratio || 0.0,
      });
    }

    let diagnosisResults: DiagnosisResult[] = [];
    if (diagnosisResultsData.length > 0) {
      diagnosisResults =
        await this.diagnosisResultService.bulkCreate(diagnosisResultsData);
    }

    // Generate new RAG advisory for the new detections
    let advisory = null;
    let diseaseName = 'Lúa khỏe mạnh / Không rõ bệnh';
    let confidence =
      detections && detections.length > 0 ? detections[0].confidence : 0.95;

    if (diagnosisResults.length > 0) {
      const sortedResults = [...diagnosisResults].sort(
        (a, b) =>
          (Number(b.affectedAreaRatio) || 0) -
            (Number(a.affectedAreaRatio) || 0) ||
          Number(b.confidence) - Number(a.confidence),
      );
      const topResult = sortedResults[0];
      confidence = Number(topResult.confidence);

      const diseasesInfo = [];
      for (const res of sortedResults) {
        const diseaseResult = await this.diseaseService.findById(res.diseaseId);
        if (diseaseResult.success) {
          diseasesInfo.push({
            name: diseaseResult.data.name,
            scientificName: diseaseResult.data.scientificName || '',
            confidence: Number(res.confidence),
            affectedAreaRatio: Number(res.affectedAreaRatio || 0.0),
            id: res.id,
          });
        }
      }

      if (diseasesInfo.length > 0) {
        diseaseName = diseasesInfo.map((d) => d.name).join(' & ');

        let ragEnvContext = '';
        if (diagnosis.envDescription) {
          ragEnvContext += `[Bối cảnh Môi trường]: ${diagnosis.envDescription}\n`;
        }
        if (diagnosis.fieldDescription) {
          ragEnvContext += `[Tình trạng Thực địa]: ${diagnosis.fieldDescription}\n`;
        }
        if (diagnosis.fieldParams) {
          const fp = diagnosis.fieldParams;
          const fpStr = `[Thông số đồng ruộng: Nước: ${fp.water || 'Bình thường'}, Giai đoạn: ${fp.growth || 'Đẻ nhánh'}, Mật độ: ${fp.density || 'Vừa'}, Sương mù: ${fp.fog ? 'Có' : 'Không'}, Rầy nâu: ${fp.leafhopper ? 'Có' : 'Không'}, Phun thuốc gần đây: ${fp.pesticide ? 'Có' : 'Không'}]`;
          ragEnvContext += fpStr;
        }
        ragEnvContext = ragEnvContext.trim();

        const advisoryResult = await this.nutritionService.getAdvisory(
          diseasesInfo,
          ragEnvContext,
        );
        if (advisoryResult.success) {
          advisory = advisoryResult.data;
          await this.diagnosisResultService.updateByID(topResult.id, {
            advisory: advisory.advisory,
          });
        }
      }
    }

    // Determine severity
    let severity = 'medium';
    if (
      advisory &&
      advisory.advisory &&
      advisory.advisory.severity_assessment
    ) {
      const sevText = advisory.advisory.severity_assessment.toLowerCase();
      if (sevText.includes('cấp bách') || sevText.includes('critical'))
        severity = 'critical';
      else if (sevText.includes('nghiêm trọng') || sevText.includes('high'))
        severity = 'high';
      else if (sevText.includes('nhẹ') || sevText.includes('low'))
        severity = 'low';
    } else if (diseaseName === 'Lúa khỏe mạnh / Không rõ bệnh') {
      severity = 'low';
    } else if (confidence > 0.8) {
      severity = 'high';
    }

    // Update Diagnosis main record with annotated supplementary image and preserve wide-shot resultImageUrl
    await this.updateByID(id, {
      supplementImageUrl: finalSupplementImageUrl,
      resultImageUrl: diagnosis.resultImageUrl,
    });

    const mappedDetections = (detections || []).map((pred: any) => {
      const className = pred.disease;
      const disease = className ? diseaseMap.get(className) : null;
      return {
        disease: disease
          ? disease.name
          : getVietnameseDiseaseName(className) ||
            className ||
            'Lúa khỏe mạnh / Không rõ bệnh',
        confidence: pred.confidence,
        color: pred.color,
        affectedAreaRatio: pred.affected_area_ratio || 0.0,
      };
    });

    if (mappedDetections.length === 0) {
      mappedDetections.push({
        disease: 'Lúa khỏe mạnh / Không rõ bệnh',
        confidence,
        color: null,
      } as any);
    }

    // Fetch the updated diagnosis to return
    const updatedDiagnosis = await this.findOne(
      { id },
      { relations: { results: { disease: true }, aiModel: true } },
    );

    return generateSuccessResult({
      ...updatedDiagnosis,
      results: mappedDetections,
      advisory,
      disease_key: diseaseName,
      disease_name: advisory?.advisory?.disease_name || diseaseName,
      confidence,
      severity,
      detections: mappedDetections,
      rag_recommendation: advisory?.advisory || null,
      annotated_image:
        updatedDiagnosis.resultImageUrl || diagnosis.originalImageUrl,
      supplementImageUrl: updatedDiagnosis.supplementImageUrl,
      supplementAnnotatedImageUrl: updatedDiagnosis.supplementImageUrl,
      low_confidence: confidence < 0.75,
      latency_ms: 450,
    });
  }
}
