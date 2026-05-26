import { Repository } from 'typeorm';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { SYSTEM_CONFIG_KEY } from '@shared/constants';
import { BaseCRUDService } from '@shared/services/base-crud.service';

import { UpdateSystemConfigDto } from './system-config.dto';
import { SystemConfig } from './system-config.entity';

@Injectable()
export class SystemConfigService
  extends BaseCRUDService<SystemConfig>
  implements OnModuleInit
{
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    @InjectRepository(SystemConfig)
    configRepo: Repository<SystemConfig>,
  ) {
    super(configRepo);
  }

  async onModuleInit() {
    this.logger.log('Checking and seeding default system configurations...');

    const defaults = [
      {
        key: SYSTEM_CONFIG_KEY.CONFIDENCE_THRESHOLD,
        value: '0.75',
        description: 'Minimum confidence score to show predictions',
      },
      {
        key: SYSTEM_CONFIG_KEY.MAX_IMAGE_SIZE_MB,
        value: '10',
        description: 'Maximum upload image size in megabytes',
      },
      {
        key: SYSTEM_CONFIG_KEY.RAG_CONTEXT_WINDOW,
        value: '5',
        description: 'Number of knowledge base chunks to retrieve',
      },
      {
        key: SYSTEM_CONFIG_KEY.WEATHER_CACHE_TTL_MINUTES,
        value: '30',
        description: 'Weather API response caching duration in minutes',
      },
      {
        key: SYSTEM_CONFIG_KEY.MAX_DIAGNOSIS_PER_DAY,
        value: '50',
        description: 'Limit of diagnosis requests allowed per farmer per day',
      },
    ];

    for (const item of defaults) {
      const exists = await this.findOne({ key: item.key });
      if (!exists) {
        await this.create({
          key: item.key,
          value: item.value,
          description: item.description,
          isActive: true,
        });
        this.logger.log(`Seeded configuration key: ${item.key}`);
      }
    }
  }

  async updateByKey(
    key: string,
    dto: UpdateSystemConfigDto,
  ): Promise<SystemConfig | null> {
    const config = await this.findOne({ key });
    if (!config) {
      return null;
    }
    return this.updateByID(config.id, dto);
  }

  async deleteByKey(key: string): Promise<boolean> {
    const config = await this.findOne({ key });
    if (!config) {
      return false;
    }
    await this.deleteByID(config.id);
    return true;
  }
}
