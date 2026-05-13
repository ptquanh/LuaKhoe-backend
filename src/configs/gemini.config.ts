import { IsString } from 'class-validator';

import { registerAs } from '@nestjs/config';

import { CONFIG_KEY } from '@shared/constants';
import { validateConfig } from '@shared/helpers/validate-config.helper';

class GeminiConfig {
  @IsString()
  apiKey: string;

  @IsString()
  embeddingModelName: string;
}

export const geminiConfig = registerAs(CONFIG_KEY.GEMINI || 'gemini', () => {
  const config = {
    apiKey: process.env.GOOGLE_GENAI_API_KEY || '',
    embeddingModelName:
      process.env.GEMINI_EMBEDDING_MODEL_NAME || 'text-embedding-004',
  };

  validateConfig(config, GeminiConfig);

  return config;
});

export default geminiConfig;
