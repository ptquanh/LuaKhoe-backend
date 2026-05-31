import * as fs from 'fs';
import { HttpResponse } from 'mvc-common-toolkit';
import * as path from 'path';
import { In, Repository } from 'typeorm';

import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { StorageService, StorageType } from '@modules/storage/storage.service';

import { getStorageFolder } from '@shared/constants';
import {
  generateNotFoundResult,
  generateSuccessResult,
} from '@shared/helpers/operation-result.helper';
import { BaseCRUDService } from '@shared/services/base-crud.service';

import { CreateAiModelDto, UpdateAiModelDto } from './ai-model.dto';
import { AiModel } from './ai-model.entity';
import { AiService } from './ai.service';

@Injectable()
export class AiModelService extends BaseCRUDService<AiModel> {
  constructor(
    @InjectRepository(AiModel)
    private readonly aiModelRepo: Repository<AiModel>,
    private readonly storageService: StorageService,
    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService,
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

  async getActiveModels(): Promise<HttpResponse<AiModel[]>> {
    const models = await this.findAll(
      { isActive: true },
      { sort: '-createdAt' },
    );
    return generateSuccessResult(models);
  }

  async findById(id: string): Promise<HttpResponse<AiModel>> {
    const model = await this.findByID(id);

    if (!model) {
      return generateNotFoundResult(`AI Model ${id} not found`);
    }

    return generateSuccessResult(model);
  }

  async uploadModel(
    file: Express.Multer.File,
    dto: CreateAiModelDto,
    userId: string,
  ): Promise<HttpResponse<AiModel>> {
    // 1. Validate file extension (must end with .onnx)
    if (!file.originalname.endsWith('.onnx')) {
      throw new BadRequestException(
        'Chỉ cho phép tải lên tệp tin có định dạng .onnx',
      );
    }

    // 2. Upload to Cloudflare R2 under getStorageFolder().AI_MODELS
    const secureUrl = await this.storageService.uploadFile(
      file,
      getStorageFolder().AI_MODELS,
      StorageType.R2,
      'raw',
    );

    // 3. Save record to DB with isActive: false
    const savedModel = await this.create({
      versionName: dto.versionName,
      releaseNotes: dto.releaseNotes,
      filePath: secureUrl,
      isActive: false,
      uploadedById: userId,
    });

    return generateSuccessResult(savedModel);
  }

  async setActive(id: string): Promise<HttpResponse<AiModel>> {
    const targetModelResult = await this.findById(id);
    if (!targetModelResult.success) {
      return targetModelResult;
    }
    const targetModel = targetModelResult.data;

    // Simply toggle the isActive state
    const newActiveState = !targetModel.isActive;
    targetModel.isActive = newActiveState;
    const result = await this.aiModelRepo.save(targetModel);

    if (newActiveState) {
      // If the new state is true, load the active model into the cache and session Map
      await this.aiService.loadActiveModel(result);
    } else {
      // If false, unload it from the RAM Map
      this.aiService.unloadModel(result.id);
    }

    return generateSuccessResult(result);
  }

  async deleteModel(id: string): Promise<HttpResponse<any>> {
    const modelResult = await this.findById(id);
    if (!modelResult.success) {
      return modelResult;
    }
    const model = modelResult.data;

    if (model.isActive) {
      throw new BadRequestException(
        'Không thể xóa mô hình AI đang ở trạng thái hoạt động.',
      );
    }

    // Delete ONNX file from Cloudflare R2
    if (model.filePath) {
      try {
        await this.storageService.deleteFile(model.filePath, StorageType.R2);
      } catch (err) {
        // Log the deletion failure but proceed to delete the database record
        console.error(
          `Failed to delete ONNX model file from R2: ${err.message}`,
        );
      }
    }

    await this.deleteByID(id);
    return generateSuccessResult({ message: 'Xóa mô hình AI thành công.' });
  }

  async updateModel(
    id: string,
    dto: UpdateAiModelDto,
    file?: Express.Multer.File,
  ): Promise<HttpResponse<AiModel>> {
    const modelResult = await this.findById(id);
    if (!modelResult.success) {
      return modelResult;
    }
    const model = modelResult.data;

    // Keep track of the old file path for Upload-First, Delete-Later logic
    const oldFilePath = model.filePath;
    let newUploadedUrl: string | null = null;

    if (dto.versionName) {
      model.versionName = dto.versionName;
    }
    if (dto.releaseNotes !== undefined) {
      model.releaseNotes = dto.releaseNotes;
    }

    // 1. Optional file replacement
    if (file) {
      if (!file.originalname.endsWith('.onnx')) {
        throw new BadRequestException(
          'Chỉ cho phép tải lên tệp tin có định dạng .onnx',
        );
      }

      // Upload-First: Upload the new file to R2
      newUploadedUrl = await this.storageService.uploadFile(
        file,
        getStorageFolder().AI_MODELS,
        StorageType.R2,
        'raw',
      );

      // Update the record with the new URL
      model.filePath = newUploadedUrl;

      // Local Cache Invalidation: Delete the old local cached file at process.cwd() / .models_cache / id.onnx
      const localFilePath = path.join(
        process.cwd(),
        '.models_cache',
        `${model.id}.onnx`,
      );
      if (fs.existsSync(localFilePath)) {
        try {
          fs.unlinkSync(localFilePath);
        } catch (err) {
          console.error(
            `Failed to delete local cached ONNX file: ${err.message}`,
          );
        }
      }
    }

    // Save updated model to database
    const updatedModel = await this.aiModelRepo.save(model);

    // 2. Delete-Later: Clean up the old tệp from R2 after successfully saving DB
    if (file && oldFilePath && newUploadedUrl) {
      try {
        await this.storageService.deleteFile(oldFilePath, StorageType.R2);
      } catch (err) {
        console.error(
          `Failed to delete old ONNX file from R2 during replacement: ${err.message}`,
        );
      }
    }

    // 3. Hot-Reload Swapping:
    // If the model being updated is currently active AND a new file was uploaded,
    // trigger unloadModel followed by loadActiveModel to instantly refresh RAM.
    if (model.isActive && file) {
      this.aiService.unloadModel(model.id);
      await this.aiService.loadActiveModel(updatedModel);
    }

    return generateSuccessResult(updatedModel);
  }

  async bulkDeleteModels(ids: string[]): Promise<HttpResponse<any>> {
    const models = await this.aiModelRepo.find({
      where: { id: In(ids) },
    });

    for (const model of models) {
      if (model.isActive) {
        throw new BadRequestException(
          `Không thể xóa mô hình AI "${model.versionName}" đang ở trạng thái hoạt động.`,
        );
      }
    }

    for (const model of models) {
      if (model.filePath) {
        try {
          await this.storageService.deleteFile(model.filePath, StorageType.R2);
        } catch (err) {
          console.error(
            `Failed to delete ONNX model file from R2 for model ${model.id}: ${err.message}`,
          );
        }
      }
    }

    await this.bulkHardDeleteByIDs(ids);
    return generateSuccessResult({
      deleted: ids.length,
      message: `Đã xóa ${ids.length} mô hình AI thành công.`,
    });
  }
}
