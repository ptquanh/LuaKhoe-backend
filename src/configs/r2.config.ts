import { IsString } from 'class-validator';

import { registerAs } from '@nestjs/config';

import { CONFIG_KEY } from '@shared/constants';
import { validateConfig } from '@shared/helpers/validate-config.helper';

class R2Config {
  @IsString()
  bucketName: string;

  @IsString()
  publicDomain: string;

  @IsString()
  accountId: string;

  @IsString()
  accessKeyId: string;

  @IsString()
  secretAccessKey: string;
}

export const r2Config = registerAs(CONFIG_KEY.R2, () => {
  const config = {
    bucketName: process.env.R2_BUCKET_NAME || '',
    publicDomain: process.env.R2_PUBLIC_DOMAIN || '',
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  };

  validateConfig(config, R2Config);

  return config;
});

export default r2Config;
