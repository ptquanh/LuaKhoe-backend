import { HttpResponse } from 'mvc-common-toolkit';

import { Injectable } from '@nestjs/common';

import {
  CreateAiModelDto,
  UpdateAiModelDto,
} from '@modules/ai-model/ai-model.dto';
import { AiModelService } from '@modules/ai-model/ai-model.service';

import { PaginationDTO } from '@shared/common/pagination.dto';

@Injectable()
export class AdminAiModelService {
  constructor(private readonly aiModelService: AiModelService) {}

  async getModels(dto: PaginationDTO): Promise<HttpResponse> {
    const models = await this.aiModelService.paginate(dto);
    return {
      success: true,
      data: models,
    };
  }

  async createModel(
    file: Express.Multer.File,
    data: CreateAiModelDto,
    userId: string,
  ): Promise<HttpResponse> {
    return this.aiModelService.uploadModel(file, data, userId);
  }

  async setActive(id: string): Promise<HttpResponse> {
    return this.aiModelService.setActive(id);
  }

  async getById(id: string): Promise<HttpResponse> {
    return this.aiModelService.findById(id);
  }

  async deleteModel(id: string): Promise<HttpResponse> {
    return this.aiModelService.deleteModel(id);
  }

  async updateModel(
    id: string,
    data: UpdateAiModelDto,
    file: Express.Multer.File,
  ): Promise<HttpResponse> {
    return this.aiModelService.updateModel(id, data, file);
  }
}
