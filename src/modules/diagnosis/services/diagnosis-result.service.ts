import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { BaseCRUDService } from '@shared/services/base-crud.service';

import { DiagnosisResult } from '../entities/diagnosis-result.entity';

@Injectable()
export class DiagnosisResultService extends BaseCRUDService<DiagnosisResult> {
  constructor(
    @InjectRepository(DiagnosisResult)
    resultRepo: Repository<DiagnosisResult>,
  ) {
    super(resultRepo);
  }
}
