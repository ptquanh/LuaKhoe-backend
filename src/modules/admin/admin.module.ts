import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModelModule } from '@modules/ai-model/ai-model.module';
import { CloudinaryModule } from '@modules/cloudinary/cloudinary.module';
import { DiagnosisResult } from '@modules/diagnosis/entities/diagnosis-result.entity';
import { Diagnosis } from '@modules/diagnosis/entities/diagnosis.entity';
import { DiseaseModule } from '@modules/disease/disease.module';
import { ForumModule } from '@modules/forum/forum.module';
import { NutritionModule } from '@modules/nutrition/nutrition.module';
import { SystemConfigModule } from '@modules/system-config/system-config.module';
import { UserModule } from '@modules/user/user.module';

import { AdminAiModelController } from './controllers/admin-ai-model.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminDiseaseController } from './controllers/admin-disease.controller';
import { AdminForumController } from './controllers/admin-forum.controller';
import { AdminNutritionController } from './controllers/admin-nutrition.controller';
import { AdminSystemConfigsController } from './controllers/admin-system-configs.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AdminAiModelService } from './services/admin-ai-model.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminDiseaseService } from './services/admin-disease.service';
import { AdminForumService } from './services/admin-forum.service';
import { AdminNutritionService } from './services/admin-nutrition.service';
import { AdminSystemConfigsService } from './services/admin-system-configs.service';
import { AdminUserService } from './services/admin-user.service';

@Module({
  imports: [
    SystemConfigModule,
    ForumModule,
    UserModule,
    AiModelModule,
    NutritionModule,
    DiseaseModule,
    CloudinaryModule,
    TypeOrmModule.forFeature([Diagnosis, DiagnosisResult]),
  ],
  controllers: [
    AdminSystemConfigsController,
    AdminForumController,
    AdminUserController,
    AdminAiModelController,
    AdminNutritionController,
    AdminDiseaseController,
    AdminDashboardController,
  ],
  providers: [
    AdminSystemConfigsService,
    AdminForumService,
    AdminUserService,
    AdminAiModelService,
    AdminNutritionService,
    AdminDiseaseService,
    AdminDashboardService,
  ],
  exports: [
    AdminSystemConfigsService,
    AdminForumService,
    AdminUserService,
    AdminAiModelService,
    AdminNutritionService,
    AdminDiseaseService,
    AdminDashboardService,
  ],
})
export class AdminModule {}
