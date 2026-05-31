import { Injectable } from '@nestjs/common';

import { SystemConfig } from '@modules/system-config/system-config.entity';
import { SystemConfigService } from '@modules/system-config/system-config.service';

import {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
} from '../dtos/admin-system-configs.dto';

@Injectable()
export class AdminSystemConfigsService {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  async findAll(): Promise<SystemConfig[]> {
    return this.systemConfigService.findAll();
  }

  async create(dto: CreateSystemConfigDto): Promise<SystemConfig> {
    return this.systemConfigService.create(dto);
  }

  async updateByKey(
    key: string,
    dto: UpdateSystemConfigDto,
  ): Promise<SystemConfig | null> {
    return this.systemConfigService.updateByKey(key, dto);
  }

  async deleteByKey(key: string): Promise<boolean> {
    return this.systemConfigService.deleteByKey(key);
  }

  async bulkDeleteConfigs(keys: string[]): Promise<void> {
    await this.systemConfigService.bulkDeleteConfigs(keys);
  }

  async get(key: string): Promise<string | null> {
    return this.systemConfigService.get(key);
  }
}
