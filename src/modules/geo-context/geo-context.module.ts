import { Module } from '@nestjs/common';

import { SystemConfigModule } from '@modules/system-config/system-config.module';

import { LocationService } from './services/location.service';
import { WeatherService } from './services/weather.service';

@Module({
  imports: [SystemConfigModule],
  providers: [LocationService, WeatherService],
  exports: [LocationService, WeatherService],
})
export class GeoContextModule {}
