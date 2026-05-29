import { HttpResponse } from 'mvc-common-toolkit';

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';

import { AiModelService } from './ai-model.service';

@ApiTags('AI Models')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('ai-models')
export class AiModelController {
  constructor(private readonly aiModelService: AiModelService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get active AI models' })
  @Roles(ROLE.ADMIN, ROLE.FARMER)
  async getActiveModels(): Promise<HttpResponse> {
    return this.aiModelService.getActiveModels();
  }
}
