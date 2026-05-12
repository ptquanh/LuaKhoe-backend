import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { DiseaseService } from './services/disease.service';

@ApiTags('Diseases')
@Controller('diseases')
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
