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
      const diseaseName = pred.disease || pred.class_name;
      const diseaseResult =
        await this.diseaseService.findOrCreateByName(diseaseName);
      if (!diseaseResult.success) continue;
      const disease = diseaseResult.data;

      diagnosisResultsData.push({
        diagnosisId: savedDiagnosis.id,
        diseaseId: disease.id,
        confidence: pred.confidence,
        maskPolygon: pred.box || pred.polygon,
      });
    }

    if (diagnosisResultsData.length > 0) {
      diagnosisResults =
        await this.diagnosisResultService.bulkCreate(diagnosisResultsData);
    }

    // 7. Generate RAG Advisory for the primary disease
    let advisory = null;
    if (diagnosisResults.length > 0) {
      const topResult = diagnosisResults.sort(
        (a, b) => b.confidence - a.confidence,
      )[0];
      const diseaseResult = await this.diseaseService.findById(
        topResult.diseaseId,
      );
      if (diseaseResult.success) {
        const disease = diseaseResult.data;
        const advisoryResult = await this.nutritionService.getAdvisory(
          disease.name,
          dto.envDescription,
        );
        advisory = advisoryResult.success ? advisoryResult.data : null;
      }
    }

    return generateSuccessResult({
      ...savedDiagnosis,
      results: diagnosisResults,
      advisory,
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
      query.andWhere('disease.name = :disease', { disease: dto.disease });
    }

    if (dto.keyword) {
      query.andWhere(
        '(disease.name ILIKE :keyword OR diagnosis.envDescription ILIKE :keyword)',
        { keyword: `%${dto.keyword}%` },
      );
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

  async getById(id: string): Promise<HttpResponse<Diagnosis>> {
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

    return generateSuccessResult(diagnosis);
  }
}
