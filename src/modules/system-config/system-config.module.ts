import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  SystemConfigController,
  SystemConfigsController,
} from './system-config.controller';
import { SystemConfig } from './system-config.entity';
import { SystemConfigService } from './system-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  controllers: [SystemConfigController, SystemConfigsController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
