import { IsNumber, IsOptional, IsString } from 'class-validator';

import { registerAs } from '@nestjs/config';

import { CONFIG_KEY } from '@shared/constants';
import { validateConfig } from '@shared/helpers/validate-config.helper';

class RedisConfig {
  @IsString()
  host: string;

  @IsNumber()
  port: number;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  prefix?: string;
}

export const redisConfig = registerAs(CONFIG_KEY.REDIS, () => {
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    prefix:
      (process.env.REDIS_PREFIX || process.env.APP_NAME || 'backend') + ':',
  };

  validateConfig(config, RedisConfig);

  return config;
});

export default redisConfig;
