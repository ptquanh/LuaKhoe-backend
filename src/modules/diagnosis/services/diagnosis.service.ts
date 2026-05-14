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
    private readonly cloudinaryService: CloudinaryService,
    private readonly aiModelService: AiModelService,
    private readonly diseaseService: DiseaseService,
    private readonly nutritionService: NutritionService,
    private readonly httpService: HttpService,
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

    // 3. Call AI Microservice for prediction
    const aiResponse = await firstValueFrom(
      this.httpService.post(`${this.aiConfig.baseUrl}/predict`, {
        image_url: originalImageUrl,
      }),
    );

    const { detections, annotated_image } = aiResponse.data;

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
      envDescription: dto.envDescription,
      modelVersionId: activeModel.id,
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
      });
    }

    if (diagnosisResultsData.length > 0) {
      diagnosisResults =
        await this.diagnosisResultService.bulkCreate(diagnosisResultsData);
    }

    // 7. Generate RAG Advisory for the primary disease
    let advisory = null;
    let diseaseName = 'Lúa khỏe mạnh / Không rõ bệnh';
    let confidence =
      detections && detections.length > 0 ? detections[0].confidence : 0.95;
    if (diagnosisResults.length > 0) {
      const topResult = diagnosisResults.sort(
        (a, b) => b.confidence - a.confidence,
      )[0];
      confidence = topResult.confidence;
      const diseaseResult = await this.diseaseService.findById(
        topResult.diseaseId,
      );
      if (diseaseResult.success) {
        const disease = diseaseResult.data;
        diseaseName = disease.name;
        const advisoryResult = await this.nutritionService.getAdvisory(
          disease.name,
          dto.envDescription,
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

    const mappedDetections = (detections || []).map((pred) => ({
      disease:
        getVietnameseDiseaseName(pred.disease || pred.class_name) ||
        pred.disease ||
        'Lúa khỏe mạnh / Không rõ bệnh',
      confidence: pred.confidence,
      color: pred.color,
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
      low_confidence: confidence < 0.7,
      latency_ms: 450,
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
          modelVersion: true,
        },
      },
    );

    if (!diagnosis) return generateNotFoundResult(`Diagnosis ${id} not found`);

    const results = diagnosis.results || [];
    let advisory = null;
    let diseaseName = 'Lúa khỏe mạnh / Không rõ bệnh';
    let confidence = 0.95;

    if (results.length > 0) {
      const topResult = [...results].sort(
        (a, b) => Number(b.confidence) - Number(a.confidence),
      )[0];
      confidence = Number(topResult.confidence);
      if (topResult.disease) {
        diseaseName = topResult.disease.name;
        const advisoryResult = await this.nutritionService.getAdvisory(
          diseaseName,
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
    }));

    if (mappedDetections.length === 0) {
      mappedDetections.push({
        disease: 'Lúa khỏe mạnh / Không rõ bệnh',
        confidence,
        color: null,
        maskPolygon: null,
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
      low_confidence: confidence < 0.7,
      latency_ms: 350,
    });
  }
}
