import { IsString } from 'class-validator';

import { registerAs } from '@nestjs/config';

import { CONFIG_KEY } from '@shared/enums';
import { validateConfig } from '@shared/helpers/validate-config.helper';

class AiServiceConfig {
  @IsString()
  baseUrl: string;
}

export const aiServiceConfig = registerAs(CONFIG_KEY.AI_SERVICE, () => {
  const config = {
    baseUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  };

  validateConfig(config, AiServiceConfig);

  return config;
});

export default aiServiceConfig;
