import { HttpResponse } from 'mvc-common-toolkit';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard as JwtAuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { generateSuccessResult } from '@shared/helpers/operation-result.helper';
import { UseCallQueue } from '@shared/interceptors/call-queue.interceptor';
import { ApplyRateLimiting } from '@shared/interceptors/rate-limiting.interceptor';

import {
  CreateSystemConfigDto,
  SystemConfigKeyParamDto,
  UpdateSystemConfigDto,
} from '../dtos/admin-system-configs.dto';
import { BulkDeleteConfigDto } from '@shared/common/bulk-delete-config.dto';
import { AdminSystemConfigsService } from '../services/admin-system-configs.service';

@ApiTags('Admin System Configs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE.ADMIN)
@Controller('admin/system-configs')
export class AdminSystemConfigsController {
  constructor(
    private readonly adminSystemConfigsService: AdminSystemConfigsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all system configurations (Admin only)' })
  async getConfigs(): Promise<HttpResponse> {
    const configs = await this.adminSystemConfigsService.findAll();
    return generateSuccessResult(configs);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new system configuration (Admin only)' })
  @UseCallQueue()
  @ApplyRateLimiting(10)
  async addConfig(@Body() dto: CreateSystemConfigDto): Promise<HttpResponse> {
    const config = await this.adminSystemConfigsService.create(dto);
    return generateSuccessResult(config);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get system configuration by key (Admin only)' })
  async getConfigByKey(
    @Param() params: SystemConfigKeyParamDto,
  ): Promise<HttpResponse> {
    const dbKey = params.key.toUpperCase().replace(/-/g, '_');
    const value = await this.adminSystemConfigsService.get(dbKey);
    if (value === null) {
      throw new NotFoundException(
        `Configuration with key "${params.key}" not found`,
      );
    }
    return generateSuccessResult({ key: dbKey, value });
  }

  @Put(':key')
  @ApiOperation({
    summary: 'Update a system configuration by key (Admin only)',
  })
  @UseCallQueue()
  @ApplyRateLimiting(20)
  async updateConfig(
    @Param() params: SystemConfigKeyParamDto,
    @Body() dto: UpdateSystemConfigDto,
  ): Promise<HttpResponse> {
    const config = await this.adminSystemConfigsService.updateByKey(
      params.key,
      dto,
    );
    if (!config) {
      throw new NotFoundException(
        `Configuration with key "${params.key}" not found`,
      );
    }
    return generateSuccessResult(config);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a system configuration by key (Admin only)',
  })
  @UseCallQueue()
  @ApplyRateLimiting(10)
  async deleteConfig(@Param() params: SystemConfigKeyParamDto): Promise<void> {
    const deleted = await this.adminSystemConfigsService.deleteByKey(
      params.key,
    );
    if (!deleted) {
      throw new NotFoundException(
        `Configuration with key "${params.key}" not found`,
      );
    }
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Bulk Delete system configurations by keys (Admin only)',
  })
  @UseCallQueue()
  @ApplyRateLimiting(10)
  async bulkDeleteConfigs(
    @Body() dto: BulkDeleteConfigDto,
  ): Promise<void> {
    await this.adminSystemConfigsService.bulkDeleteConfigs(dto.keys);
  }
}
