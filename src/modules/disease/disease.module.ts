import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CloudinaryModule } from '@modules/cloudinary/cloudinary.module';
import { UserModule } from '@modules/user/user.module';

import { DiseaseController } from './disease.controller';
import { Disease } from './disease.entity';
import { DiseaseSeederService } from './services/disease-seeder.service';
import { DiseaseService } from './services/disease.service';

@Module({
  imports: [TypeOrmModule.forFeature([Disease]), UserModule, CloudinaryModule],
  controllers: [DiseaseController],
  providers: [DiseaseService, DiseaseSeederService],
  exports: [DiseaseService, DiseaseSeederService],
})
export class DiseaseModule {}
