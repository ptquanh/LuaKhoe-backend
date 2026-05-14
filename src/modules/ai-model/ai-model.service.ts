import { HttpResponse } from 'mvc-common-toolkit';
import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import {
  generateNotFoundResult,
  generateSuccessResult,
} from '@shared/helpers/operation-result.helper';
import { BaseCRUDService } from '@shared/services/base-crud.service';

import { AiModel } from './ai-model.entity';

@Injectable()
export class AiModelService extends BaseCRUDService<AiModel> {
  constructor(
    @InjectRepository(AiModel)
    private readonly aiModelRepo: Repository<AiModel>,
  ) {
    super(aiModelRepo);
  }

  async getActiveModel(): Promise<HttpResponse<AiModel>> {
    const model = await this.findOne(
      { isActive: true },
      { order: { createdAt: 'DESC' } },
    );

    if (!model) {
      return generateNotFoundResult(
        'No active AI model found. Please seed the database.',
      );
    }

    return generateSuccessResult(model);
  }

  async findById(id: string): Promise<HttpResponse<AiModel>> {
    const model = await this.findByID(id);

    if (!model) {
      return generateNotFoundResult(`AI Model ${id} not found`);
    }

    return generateSuccessResult(model);
  }

  async createModel(data: Partial<AiModel>): Promise<HttpResponse<AiModel>> {
    const savedModel = await this.create(data);
    return generateSuccessResult(savedModel);
  }

  async setActive(id: string): Promise<HttpResponse<AiModel>> {
    // Get the target model
    const targetModel = await this.findById(id);
    if (!targetModel.success) {
      return targetModel;
    }

    // If the target is already active, do nothing
    if (targetModel.data.isActive) {
      return targetModel;
    }

    // Deactivate currently active models first
    await this.bulkUpdate({ isActive: true }, { isActive: false });
    // Activate the target
    const result = await this.updateByID(id, { isActive: true });
    return generateSuccessResult(result);
  }
}
