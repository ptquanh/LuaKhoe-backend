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
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { generateSuccessResult } from '@shared/helpers/operation-result.helper';

import {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
} from './system-config.dto';
import { SystemConfigService } from './system-config.service';

@ApiTags('Admin Configs')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(ROLE.ADMIN)
@Controller('admin/configs')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system configurations (Admin only)' })
  async getConfigs(): Promise<HttpResponse> {
    const configs = await this.systemConfigService.findAll();
    return generateSuccessResult(configs);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new system configuration (Admin only)' })
  async addConfig(@Body() dto: CreateSystemConfigDto): Promise<HttpResponse> {
    const config = await this.systemConfigService.create(dto);
    return generateSuccessResult(config);
  }

  @Put(':key')
  @ApiOperation({
    summary: 'Update a system configuration by key (Admin only)',
  })
  async updateConfig(
    @Param('key') key: string,
    @Body() dto: UpdateSystemConfigDto,
  ): Promise<HttpResponse> {
    const config = await this.systemConfigService.updateByKey(key, dto);
    if (!config) {
      throw new NotFoundException(`Configuration with key "${key}" not found`);
    }
    return generateSuccessResult(config);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a system configuration by key (Admin only)',
  })
  async deleteConfig(@Param('key') key: string): Promise<void> {
    const deleted = await this.systemConfigService.deleteByKey(key);
    if (!deleted) {
      throw new NotFoundException(`Configuration with key "${key}" not found`);
    }
  }
}

@ApiTags('System Configs')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(ROLE.ADMIN)
@Controller('system-configs')
export class SystemConfigsController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get(':key')
  @ApiOperation({ summary: 'Get system configuration by key (Admin only)' })
  async getConfigByKey(@Param('key') key: string): Promise<HttpResponse> {
    const dbKey = key.toUpperCase().replace(/-/g, '_');
    const value = await this.systemConfigService.get(dbKey);
    if (value === null) {
      throw new NotFoundException(`Configuration with key "${key}" not found`);
    }
    return generateSuccessResult({ key: dbKey, value });
  }
}
