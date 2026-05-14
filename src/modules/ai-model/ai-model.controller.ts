import { HttpResponse } from 'mvc-common-toolkit';

import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequestUser } from '@shared/decorators/request-user.decorator';
import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { UserAuthProfile } from '@shared/interfaces';

import { CreateAiModelDto } from './ai-model.dto';
import { AiModelService } from './ai-model.service';

import { PaginationDTO } from '@shared/common/pagination.dto';

import {
  generateSuccessResult,
} from '@shared/helpers/operation-result.helper';

@ApiTags('AI Models')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('ai-models')
export class AiModelController {
  constructor(private readonly aiModelService: AiModelService) {}

  @Get()
  @ApiOperation({ summary: 'Get AI models with pagination' })
  @Roles(ROLE.ADMIN)
  async getModels(@Query() dto: PaginationDTO): Promise<HttpResponse> {
    const models = await this.aiModelService.paginate(dto);
    return generateSuccessResult(models);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active AI model' })
  @Roles(ROLE.ADMIN, ROLE.FARMER)
  async getActiveModel(): Promise<HttpResponse> {
    return this.aiModelService.getActiveModel();
  }

  @Post()
  @ApiOperation({ summary: 'Create new AI model' })
  @Roles(ROLE.ADMIN)
  async createModel(
    @RequestUser() user: UserAuthProfile,
    @Body() data: CreateAiModelDto,
  ): Promise<HttpResponse> {
    return this.aiModelService.createModel({
      ...data,
      uploadedById: user.id,
    });
  }

  @Put(':id/active')
  @ApiOperation({ summary: 'Set an AI model as active' })
  @Roles(ROLE.ADMIN)
  async setActive(@Param('id', ParseUUIDPipe) id: string): Promise<HttpResponse> {
    return this.aiModelService.setActive(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AI model by ID' })
  @Roles(ROLE.ADMIN)
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<HttpResponse> {
    return this.aiModelService.findById(id);
  }
}
