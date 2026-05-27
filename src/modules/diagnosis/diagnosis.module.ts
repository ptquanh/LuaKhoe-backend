import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModelModule } from '@modules/ai-model/ai-model.module';
import { CloudinaryModule } from '@modules/cloudinary/cloudinary.module';
import { DiseaseModule } from '@modules/disease/disease.module';
import { GeoContextModule } from '@modules/geo-context/geo-context.module';
import { NutritionModule } from '@modules/nutrition/nutrition.module';
import { SystemConfigModule } from '@modules/system-config/system-config.module';
import { UserModule } from '@modules/user/user.module';

import { DashboardController } from './dashboard.controller';
import { DiagnosisController } from './diagnosis.controller';
import { DiagnosisResult } from './entities/diagnosis-result.entity';
import { Diagnosis } from './entities/diagnosis.entity';
import { DashboardService } from './services/dashboard.service';
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
    UserModule,
    SystemConfigModule,
    GeoContextModule,
  ],
  controllers: [DiagnosisController, DashboardController],
  providers: [DiagnosisService, DiagnosisResultService, DashboardService],
  exports: [DiagnosisService, DiagnosisResultService, DashboardService],
})
export class DiagnosisModule {}
