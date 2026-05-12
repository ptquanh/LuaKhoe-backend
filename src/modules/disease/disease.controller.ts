import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '@shared/guards/auth.guard';

import { DiseaseService } from './disease.service';

@ApiTags('Diseases')
@Controller('diseases')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class DiseaseController {
  constructor(private readonly diseaseService: DiseaseService) {}

  @Get()
  async findAll() {
    return this.diseaseService.findAllDiseases();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.diseaseService.findById(id);
  }
}
