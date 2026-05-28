import { HttpResponse, OperationResult } from 'mvc-common-toolkit';
import { Repository } from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { PaginatedByKeywordDTO } from '@shared/common/pagination.dto';
import { DISEASE_STATUS } from '@shared/constants';
import {
  generateNotFoundResult,
  generateSuccessResult,
} from '@shared/helpers/operation-result.helper';
import { BaseCRUDService } from '@shared/services/base-crud.service';

import { Disease } from '../disease.entity';

@Injectable()
export class DiseaseService extends BaseCRUDService<Disease> {
  private readonly logger = new Logger(DiseaseService.name);

  constructor(
    @InjectRepository(Disease)
    diseaseRepo: Repository<Disease>,
  ) {
    super(diseaseRepo);
  }

  async findAllDiseases(): Promise<HttpResponse<Disease[]>> {
    const diseases = await this.findAll(
      { status: DISEASE_STATUS.VISIBLE },
      { order: { name: 'ASC' } },
    );
    return generateSuccessResult(diseases);
  }

  async findById(id: string): Promise<HttpResponse<Disease>> {
    const disease = await this.findByID(id);
    if (!disease) return generateNotFoundResult(`Disease ${id} not found`);
    return generateSuccessResult(disease);
  }

  async findByName(name: string): Promise<HttpResponse<Disease>> {
    const disease = await this.findOne({ name });
    if (!disease) return generateNotFoundResult(`Disease ${name} not found`);
    return generateSuccessResult(disease);
  }

  async findByAiClassName(aiClassName: string): Promise<HttpResponse<Disease>> {
    const disease = await this.findOne({ aiClassName });
    if (!disease) {
      return generateNotFoundResult(
        `Disease with AI class name ${aiClassName} not found`,
      );
    }
    return generateSuccessResult(disease);
  }

  async findByAiClassNames(names: string[]): Promise<Disease[]> {
    if (!names || names.length === 0) return [];
    return this.model
      .createQueryBuilder('disease')
      .where('disease.aiClassName IN (:...names)', { names })
      .getMany();
  }

  async findOrCreateByName(
    name: string,
    aiClassName?: string,
  ): Promise<HttpResponse<Disease>> {
    const existing = await this.findByName(name);
    if (existing.success) return existing;

    const fallbackAiClassName =
      aiClassName || name.toLowerCase().replace(/\s+/g, '_');
    const savedDisease = await this.create({
      name,
      aiClassName: fallbackAiClassName,
    });
    this.logger.log(
      `Auto-created disease: ${name} with AI class: ${fallbackAiClassName}`,
    );
    return generateSuccessResult(savedDisease);
  }

  async createDiseases(data: Partial<Disease>): Promise<HttpResponse<Disease>> {
    const savedDisease = await this.create(data);
    return generateSuccessResult(savedDisease);
  }

  async update(
    id: string,
    data: Partial<Disease>,
  ): Promise<HttpResponse<Disease>> {
    const result = await this.findById(id);
    if (!result.success) return result;

    const disease = result.data;
    Object.assign(disease, data);

    const savedDisease = await this.updateByID(id, disease);
    return generateSuccessResult(savedDisease);
  }

  async findDiseasesForAdmin(
    dto: PaginatedByKeywordDTO,
  ): Promise<OperationResult> {
    const result = await this.paginateByKeyword(
      dto,
      ['name', 'scientificName'],
      dto.keyword,
    );
    return generateSuccessResult(result);
  }
}
