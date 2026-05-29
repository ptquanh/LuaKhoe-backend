import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '@shared/guards/auth.guard';

import { GetAdvisoryDto } from './nutrition.dto';
import { NutritionService } from './nutrition.service';

@ApiTags('Nutritions')
@ApiBearerAuth()
@Controller('nutrition')
@UseGuards(AuthGuard)
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Post('advisory')
  @ApiOperation({ summary: 'Get nutrition advisory for a disease' })
  async getAdvisory(@Body() dto: GetAdvisoryDto) {
    return this.nutritionService.getAdvisory(dto.diseaseName, dto.context);
  }
}
