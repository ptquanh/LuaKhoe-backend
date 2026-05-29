import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '@shared/guards/auth.guard';

import { FindOneDiseaseParamDTO } from './disease.dto';
import { DiseaseService } from './services/disease.service';

@ApiTags('Diseases')
@ApiBearerAuth()
@Controller('diseases')
@UseGuards(AuthGuard)
export class DiseaseController {
  constructor(private readonly diseaseService: DiseaseService) {}

  @Get()
  @ApiOperation({ summary: 'Get all visible diseases' })
  async findAll() {
    return this.diseaseService.findAllDiseases();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed disease by ID' })
  async findById(@Param() params: FindOneDiseaseParamDTO) {
    return this.diseaseService.findById(params.id);
  }
}
