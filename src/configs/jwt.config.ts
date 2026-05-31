import { IsString } from 'class-validator';

import { registerAs } from '@nestjs/config';

import { CONFIG_KEY } from '@shared/enums';
import { validateConfig } from '@shared/helpers/validate-config.helper';

class JwtConfig {
  @IsString()
  secret: string;

  @IsString()
  expiration: string;
}

export const jwtConfig = registerAs(CONFIG_KEY.JWT, () => {
  const config = {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION || '365d',
  };

  validateConfig(config, JwtConfig);

  return config;
});

export default jwtConfig;
