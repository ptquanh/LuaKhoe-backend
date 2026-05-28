import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CloudinaryModule } from '@modules/cloudinary/cloudinary.module';
import { UserModule } from '@modules/user/user.module';

import { AiModelController } from './ai-model.controller';
import { AiModel } from './ai-model.entity';
import { AiModelService } from './ai-model.service';
import { AiService } from './ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiModel]),
    UserModule,
    HttpModule,
    CloudinaryModule,
  ],
  controllers: [AiModelController],
  providers: [AiModelService, AiService],
  exports: [AiModelService, AiService],
})
export class AiModelModule {}
