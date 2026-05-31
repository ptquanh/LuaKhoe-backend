import { HttpResponse } from 'mvc-common-toolkit';

import { Injectable } from '@nestjs/common';

import { FileService } from '@modules/cloudinary/file.service';
import {
  CreateDiseaseDTO,
  UpdateDiseaseDTO,
} from '@modules/disease/disease.dto';
import { DiseaseService } from '@modules/disease/services/disease.service';
import { StorageService, StorageType } from '@modules/storage/storage.service';

import { PaginatedByKeywordDTO } from '@shared/common/pagination.dto';
import { getStorageFolder } from '@shared/constants';
import { generateSuccessResult } from '@shared/helpers/operation-result.helper';

@Injectable()
export class AdminDiseaseService {
  constructor(
    private readonly diseaseService: DiseaseService,
    private readonly storageService: StorageService,
    private readonly fileService: FileService,
  ) {}

  async findDiseasesForAdmin(dto: PaginatedByKeywordDTO) {
    return this.diseaseService.findDiseasesForAdmin(dto);
  }

  async createDisease(dto: CreateDiseaseDTO) {
    return this.diseaseService.createDiseases(dto);
  }

  async uploadImage(file: Express.Multer.File): Promise<HttpResponse> {
    await this.fileService.validateImageSize(file);
    const imageUrl = await this.storageService.uploadFile(
      file,
      getStorageFolder().DIAGNOSES,
      StorageType.CLOUDINARY,
    );
    return generateSuccessResult({ imageUrl });
  }

  async updateDisease(id: string, dto: UpdateDiseaseDTO) {
    return this.diseaseService.update(id, dto);
  }

  async deleteDisease(id: string): Promise<HttpResponse> {
    await this.diseaseService.deleteByID(id);
    return generateSuccessResult(null, 'Disease deleted successfully');
  }

  async bulkDeleteDiseases(ids: string[]): Promise<HttpResponse> {
    await this.diseaseService.bulkHardDeleteByIDs(ids);
    return generateSuccessResult({
      deleted: ids.length,
      message: `Đã xóa ${ids.length} bệnh thành công`,
    });
  }
}
