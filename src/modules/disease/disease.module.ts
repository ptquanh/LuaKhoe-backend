import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '@modules/user/user.module';

import { DiseaseController } from './disease.controller';
import { Disease } from './disease.entity';
import { DiseaseService } from './disease.service';

@Module({
  imports: [TypeOrmModule.forFeature([Disease]), UserModule],
  controllers: [DiseaseController],
  providers: [DiseaseService],
  exports: [DiseaseService],
})
export class DiseaseModule {}
