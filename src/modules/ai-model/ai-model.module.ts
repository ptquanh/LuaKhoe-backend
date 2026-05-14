import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '@modules/user/user.module';

import { AiModelController } from './ai-model.controller';
import { AiModel } from './ai-model.entity';
import { AiModelService } from './ai-model.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiModel]), UserModule],
  controllers: [AiModelController],
  providers: [AiModelService],
  exports: [AiModelService],
})
export class AiModelModule {}
