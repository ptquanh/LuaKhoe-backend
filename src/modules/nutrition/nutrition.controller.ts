import {
  Body,
  Controller,
  ParseArrayPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';

import { GetAdvisoryDto, SeedNutritionDocDto } from './nutrition.dto';
import { NutritionService } from './nutrition.service';

@ApiTags('Nutritions')
@ApiBearerAuth()
@Controller('nutrition')
@UseGuards(AuthGuard)
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Post('seed')
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Seed nutrition knowledge documents (Admin only)' })
  @ApiBody({ type: [SeedNutritionDocDto] })
  async seed(
    @Body(new ParseArrayPipe({ items: SeedNutritionDocDto }))
    documents: SeedNutritionDocDto[],
  ) {
    return this.nutritionService.seedKnowledge(documents);
  }

  @Post('advisory')
  @ApiOperation({ summary: 'Get nutrition advisory for a disease' })
  async getAdvisory(@Body() dto: GetAdvisoryDto) {
    return this.nutritionService.getAdvisory(dto.diseaseName, dto.context);
  }
}
