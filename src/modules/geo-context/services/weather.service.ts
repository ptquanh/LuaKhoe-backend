import axios from 'axios';
import { RedisService, SET_CACHE_POLICY } from 'mvc-common-toolkit';
import { tryParseStringIntoCorrectData } from 'mvc-common-toolkit/dist/src/pkg/object-helper';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { SystemConfigService } from '@modules/system-config/system-config.service';

import { weatherCacheKey } from '@shared/cache-key';
import { INJECTION_TOKEN } from '@shared/constants';
import { SYSTEM_CONFIG_KEY } from '@shared/enums';
import { WeatherInfo } from '@shared/interfaces';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    @Inject(INJECTION_TOKEN.REDIS_SERVICE)
    private cacheService: RedisService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  public async getWeather(lat: number, lng: number): Promise<WeatherInfo> {
    const fallback: WeatherInfo = {
      humidity: 75.0,
      temperature: 28.0,
      rainfall: 'none',
      wind: 'calm',
      source: 'default',
    };

    if (
      lat === undefined ||
      lng === undefined ||
      lat === null ||
      lng === null
    ) {
      this.logger.warn(
        'Coordinates are missing for weather API — using default weather',
      );
      return fallback;
    }

    // 1. Định dạng khóa Cache lưu trữ trên Redis (Lưới ~1.1km)
    const key = weatherCacheKey(lat, lng);

    try {
      // 2. Kiểm tra dữ liệu trong Redis Cache trước
      const cachedData = await this.cacheService.get(key);
      if (cachedData) {
        return tryParseStringIntoCorrectData(cachedData);
      }

      const url = 'https://api.open-meteo.com/v1/forecast';
      const response = await axios.get(url, {
        params: {
          latitude: lat,
          longitude: lng,
          current: 'temperature_2m,relative_humidity_2m,rain,wind_speed_10m',
        },
        timeout: 5000,
      });

      if (response.status === 200 && response.data?.current) {
        const current = response.data.current;
        const humidity = Number(current.relative_humidity_2m ?? 75.0);
        const temperature = Number(current.temperature_2m ?? 28.0);
        const rainMm = Number(current.rain ?? 0.0);
        const windSpeedKmh = Number(current.wind_speed_10m ?? 0.0);

        // Phân loại lượng mưa theo nghiệp vụ nghiệp nông nghiệp của bạn
        let rainfall: 'none' | 'light' | 'heavy' = 'none';
        if (rainMm === 0) {
          rainfall = 'none';
        } else if (rainMm < 2.5) {
          rainfall = 'light';
        } else {
          rainfall = 'heavy';
        }

        // Phân loại sức gió
        let wind: 'calm' | 'moderate' | 'strong' = 'calm';
        if (windSpeedKmh < 12) {
          wind = 'calm';
        } else if (windSpeedKmh < 29) {
          wind = 'moderate';
        } else {
          wind = 'strong';
        }

        const weatherData: WeatherInfo = {
          humidity,
          temperature,
          rainfall,
          wind,
          source: 'api',
        };

        const weatherTtlStr = await this.systemConfigService.get(
          SYSTEM_CONFIG_KEY.WEATHER_CACHE_TTL_MINUTES,
        );
        const weatherTtlMinutes = weatherTtlStr ? Number(weatherTtlStr) : 30;

        await this.cacheService.set(key, JSON.stringify(weatherData), {
          policy: SET_CACHE_POLICY.WITH_TTL,
          value: weatherTtlMinutes * 60,
        });

        return weatherData;
      } else {
        this.logger.warn(
          `Open-Meteo API returned non-200 status (${response.status}) — fallback to default weather`,
        );
      }
    } catch (error: any) {
      this.logger.warn(
        `Open-Meteo API call failed: ${error.message} — fallback to default weather`,
      );
    }

    return fallback;
  }
}
