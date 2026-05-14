import { HttpResponse } from 'mvc-common-toolkit';
import { Repository } from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { FEEDBACK_STATUS } from '@shared/constants';
import {
  generateNotFoundResult,
  generateSuccessResult,
} from '@shared/helpers/operation-result.helper';
import { BaseCRUDService } from '@shared/services/base-crud.service';

import { Feedback } from './entities/feedback.entity';
import { CreateFeedbackDto } from './feedback.dto';

@Injectable()
export class FeedbackService extends BaseCRUDService<Feedback> {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    feedbackRepo: Repository<Feedback>,
  ) {
    super(feedbackRepo);
  }

  async createFeedback(
    userId: string,
    dto: CreateFeedbackDto,
  ): Promise<HttpResponse<Feedback>> {
    this.logger.log(`Creating feedback for user ${userId}`);

    const actualDiseases = (dto.actualDiseaseIds || []).map((diseaseId) => ({
      diseaseId,
    }));

    const savedFeedback = await this.create({
      userId,
      diagnosisId: dto.diagnosisId,
      userMessage: dto.userMessage,
      status: FEEDBACK_STATUS.PENDING,
      actualDiseases: actualDiseases as any,
    });

    const result = await this.findOne(
      { id: savedFeedback.id },
      {
        relations: {
          actualDiseases: {
            disease: true,
          },
        },
      },
    );

    return generateSuccessResult(result);
  }

  async findByUserId(userId: string): Promise<HttpResponse<Feedback[]>> {
    const feedbacks = await this.findAll(
      { userId },
      {
        relations: {
          actualDiseases: {
            disease: true,
          },
          diagnosis: {
            results: {
              disease: true,
            },
          },
        },
        sort: '-createdAt',
      },
    );
    return generateSuccessResult(feedbacks);
  }

  async getAllFeedbacks(): Promise<HttpResponse<Feedback[]>> {
    const feedbacks = await this.findAll(
      {},
      {
        relations: {
          user: true,
          diagnosis: {
            results: {
              disease: true,
            },
          },
          actualDiseases: {
            disease: true,
          },
        },
        sort: '-createdAt',
      },
    );
    return generateSuccessResult(feedbacks);
  }

  async processFeedback(
    adminId: string,
    id: string,
    status: FEEDBACK_STATUS,
    response?: string,
  ): Promise<HttpResponse<Feedback>> {
    this.logger.log(
      `Admin ${adminId} processing feedback ${id} with status ${status}`,
    );

    const feedback = await this.findOne({ id });
    if (!feedback) {
      return generateNotFoundResult(`Feedback ${id} not found`);
    }

    feedback.status = status;
    feedback.adminId = adminId;
    feedback.adminResponse = response;
    feedback.processedAt = new Date();

    const updatedFeedback = await this.model.save(feedback);
    return generateSuccessResult(updatedFeedback);
  }
}
