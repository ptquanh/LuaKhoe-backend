import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { APP_ENV } from 'mvc-common-toolkit';

import { registerAs } from '@nestjs/config';

import { CONFIG_KEY } from '@shared/constants';
import { validateConfig } from '@shared/helpers/validate-config.helper';

class AppConfig {
  @IsEnum(APP_ENV)
  nodeEnv: APP_ENV;

  @IsNumber()
  port: number;

  @IsBoolean()
  enableCors: boolean;

  @IsBoolean()
  enableSwagger: boolean;

  @IsString()
  appName: string;

  @IsString()
  serviceName: string;

  @IsString()
  @IsOptional()
  auditWebhookUrl?: string;

  @IsString()
  googleClientId: string;

  @IsString()
  googleClientSecret: string;

  @IsString()
  googleCallbackUrl: string;
}

export const appConfig = registerAs(CONFIG_KEY.APP, () => {
  const config = {
    nodeEnv: (process.env.NODE_ENV as APP_ENV) || APP_ENV.DEVELOPMENT,
    port: parseInt(process.env.PORT || '3000', 10),
    enableCors: process.env.ENABLE_CORS === 'true',
    enableSwagger: process.env.ENABLE_SWAGGER === 'true',
    appPublicUrl: process.env.APP_PUBLIC_URL,
    appName: process.env.APP_NAME,
    serviceName:
      process.env.SERVICE_NAME || 'boilerplate-backend-nestjs-postgresql',
    auditWebhookUrl: process.env.AUDIT_WEBHOOK_URL,
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
  };

  validateConfig(config, AppConfig);

  return config;
});

export default appConfig;
