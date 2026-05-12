import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModel } from './ai-model.entity';
import { AiModelService } from './ai-model.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiModel])],
  providers: [AiModelService],
  exports: [AiModelService],
})
export class AiModelModule {}
