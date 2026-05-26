import axios from 'axios';
import { Logger } from '@nestjs/common';

const logger = new Logger('WeatherHelper');
const weatherCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

export interface WeatherInfo {
  humidity: number;
  temperature: number;
  rainfall: 'none' | 'light' | 'heavy';
  wind: 'calm' | 'moderate' | 'strong';
  source: 'api' | 'default';
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherInfo> {
  const fallback: WeatherInfo = {
    humidity: 75.0,
    temperature: 28.0,
    rainfall: 'none',
    wind: 'calm',
    source: 'default',
  };

  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    logger.warn('Coordinates are missing for weather API — using default weather');
    return fallback;
  }

  // Cache key based on coordinates rounded to 2 decimal places (approx. 1.1km grid)
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = 'https://api.open-meteo.com/v1/forecast';
    const response = await axios.get(url, {
      params: {
        latitude: lat,
        longitude: lng,
        current: 'temperature_2m,relative_humidity_2m,rain,wind_speed_10m',
      },
      timeout: 5000,
    });

    if (response.status === 200 && response.data && response.data.current) {
      const current = response.data.current;
      const humidity = Number(current.relative_humidity_2m ?? 75.0);
      const temperature = Number(current.temperature_2m ?? 28.0);
      const rainMm = Number(current.rain ?? 0.0);
      const windSpeedKmh = Number(current.wind_speed_10m ?? 0.0);

      let rainfall: 'none' | 'light' | 'heavy' = 'none';
      if (rainMm === 0) {
        rainfall = 'none';
      } else if (rainMm < 2.5) {
        rainfall = 'light';
      } else {
        rainfall = 'heavy';
      }

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

      weatherCache.set(key, { data: weatherData, timestamp: Date.now() });
      return weatherData;
    } else {
      logger.warn(`Open-Meteo API returned non-200 status (${response.status}) — fallback to default weather`);
    }
  } catch (error: any) {
    logger.warn(`Open-Meteo API call failed: ${error.message} — fallback to default weather`);
  }

  return fallback;
}
