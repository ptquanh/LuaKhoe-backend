import { IsString } from 'class-validator';

import { registerAs } from '@nestjs/config';

import { validateConfig } from '@shared/helpers/validate-config.helper';

class CohereConfig {
  @IsString()
  apiKey: string;
}

export const cohereConfig = registerAs('cohere', () => {
  const config = {
    apiKey: process.env.COHERE_API_KEY || '',
  };

  validateConfig(config, CohereConfig);

  return config;
});

export default cohereConfig;
