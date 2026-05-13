import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '@modules/user/user.module';

import { NutritionController } from './nutrition.controller';
import { Nutritions } from './nutrition.entity';
import { NutritionService } from './nutrition.service';

@Module({
  imports: [TypeOrmModule.forFeature([Nutritions]), UserModule],
  controllers: [NutritionController],
  providers: [NutritionService],
  exports: [NutritionService],
})
export class NutritionModule {}
