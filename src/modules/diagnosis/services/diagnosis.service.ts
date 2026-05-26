import { HttpResponse } from 'mvc-common-toolkit';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import aiServiceConfig from '@configs/ai-service.config';

import { AiModelService } from '@modules/ai-model/ai-model.service';
import { CloudinaryService } from '@modules/cloudinary/cloudinary.service';
import { DiseaseService } from '@modules/disease/disease.service';
import { NutritionService } from '@modules/nutrition/nutrition.service';
import { UserFieldService } from '@modules/user/services/user-field.service';

import { getVietnameseDiseaseName } from '@shared/helpers/disease.helper';
import { reverseGeocode } from '@shared/helpers/geocoding.helper';
import {
  generateNotFoundResult,
  generateSuccessResult,
} from '@shared/helpers/operation-result.helper';
import { fetchWeather } from '@shared/helpers/weather.helper';
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
    private readonly cloudinaryService: CloudinaryService,
    private readonly aiModelService: AiModelService,
    private readonly diseaseService: DiseaseService,
    private readonly nutritionService: NutritionService,
    private readonly httpService: HttpService,
    private readonly userFieldService: UserFieldService,
    @Inject(aiServiceConfig.KEY)
    private readonly aiConfig: ConfigType<typeof aiServiceConfig>,
  ) {
    super(diagnosisRepo);
  }

  async createDiagnosis(
    userId: string,
    dto: CreateDiagnosisDto,
    file: Express.Multer.File,
  ): Promise<HttpResponse<any>> {
    this.logger.log(`Processing diagnosis for user ${userId}`);

    // 1. Upload original image to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadImage(file);
    const originalImageUrl = uploadResult.secure_url;

    // 2. Get Active AI Model
    const activeModelResult = await this.aiModelService.getActiveModel();
    if (!activeModelResult.success) return activeModelResult;
    const activeModel = activeModelResult.data;

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
      geocodedProvince = await reverseGeocode(dto.gpsLat, dto.gpsLng);
    }

    // 2.7 Fetch Weather on NestJS (Orchestrator)
    let weatherData = null;
    if (dto.gpsLat !== undefined && dto.gpsLng !== undefined) {
      weatherData = await fetchWeather(dto.gpsLat, dto.gpsLng);
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

    // 3. Call AI Microservice for prediction
    const aiResponse = await firstValueFrom(
      this.httpService.post(`${this.aiConfig.baseUrl}/predict`, {
        image_url: originalImageUrl,
        gps_lat: dto.gpsLat,
        gps_lng: dto.gpsLng,
        province: geocodedProvince,
        field_params: dto.fieldParams,
        weather: weatherData,
      }),
    );

    const { detections, annotated_image, env_adjustment } = aiResponse.data;

    // 4. Upload annotated result image to Cloudinary
    let resultImageUrl = null;
    if (annotated_image) {
      const resultUpload =
        await this.cloudinaryService.uploadBase64Image(annotated_image);
      resultImageUrl = resultUpload.secure_url;
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
      fieldParams: dto.fieldParams,
      modelVersionId: activeModel.id,
      weatherData: env_adjustment?.weather || null,
      fieldId: dto.fieldId || null,
    });

    // 6. Save Individual Results
    let diagnosisResults: DiagnosisResult[] = [];
    const diagnosisResultsData: Partial<DiagnosisResult>[] = [];
    for (const pred of detections || []) {
      const rawName = pred.disease || pred.class_name;
      const mappedDiseaseName = getVietnameseDiseaseName(rawName);
      if (!mappedDiseaseName) continue;

      const diseaseResult =
        await this.diseaseService.findOrCreateByName(mappedDiseaseName);
      if (!diseaseResult.success) continue;
      const disease = diseaseResult.data;

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
            confidence: Number(res.confidence),
            affectedAreaRatio: Number(res.affectedAreaRatio || 0.0),
            id: res.id,
          });
        }
      }

      if (diseasesInfo.length > 0) {
        diseaseName = diseasesInfo.map((d) => d.name).join(' & ');
        // Merge fieldParams into envDescription for better RAG context if fieldParams exists
        let ragEnvContext = dto.envDescription || '';
        if (dto.fieldParams) {
          const fp = dto.fieldParams;
          const fpStr = `[Thông số đồng ruộng: Nước: ${fp.water || 'Bình thường'}, Giai đoạn: ${fp.growth || 'Đẻ nhánh'}, Mật độ: ${fp.density || 'Vừa'}, Sương mù: ${fp.fog ? 'Có' : 'Không'}, Rầy nâu: ${fp.leafhopper ? 'Có' : 'Không'}, Phun thuốc gần đây: ${fp.pesticide ? 'Có' : 'Không'}]`;
          ragEnvContext = ragEnvContext ? `${ragEnvContext}. ${fpStr}` : fpStr;
        }

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

    const mappedDetections = (detections || []).map((pred) => ({
      disease:
        getVietnameseDiseaseName(pred.disease || pred.class_name) ||
        pred.disease ||
        'Lúa khỏe mạnh / Không rõ bệnh',
      confidence: pred.confidence,
      color: pred.color,
      affectedAreaRatio: pred.affected_area_ratio || 0.0,
    }));

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
          '(disease.name ILIKE :keyword OR diagnosis.envDescription ILIKE :keyword OR result.id IS NULL)',
          { keyword: `%${dto.keyword}%` },
        );
      } else {
        query.andWhere(
          '(disease.name ILIKE :keyword OR diagnosis.envDescription ILIKE :keyword)',
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
}
