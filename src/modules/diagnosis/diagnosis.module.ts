import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModelModule } from '@modules/ai-model/ai-model.module';
import { CloudinaryModule } from '@modules/cloudinary/cloudinary.module';
import { DiseaseModule } from '@modules/disease/disease.module';
import { NutritionModule } from '@modules/nutrition/nutrition.module';

import { DiagnosisController } from './diagnosis.controller';
import { DiagnosisResult } from './entities/diagnosis-result.entity';
import { Diagnosis } from './entities/diagnosis.entity';
import { DiagnosisResultService } from './services/diagnosis-result.service';
import { DiagnosisService } from './services/diagnosis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Diagnosis, DiagnosisResult]),
    HttpModule,
    CloudinaryModule,
    AiModelModule,
    DiseaseModule,
    NutritionModule,
  ],
  controllers: [DiagnosisController],
  providers: [DiagnosisService, DiagnosisResultService],
  exports: [DiagnosisService, DiagnosisResultService],
})
export class DiagnosisModule {}
