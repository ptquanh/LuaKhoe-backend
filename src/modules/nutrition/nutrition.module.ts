import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NutritionController } from './nutrition.controller';
import { Nutritions } from './nutrition.entity';
import { NutritionService } from './nutrition.service';

@Module({
  imports: [TypeOrmModule.forFeature([Nutritions])],
  controllers: [NutritionController],
  providers: [NutritionService],
  exports: [NutritionService],
})
export class NutritionModule {}
