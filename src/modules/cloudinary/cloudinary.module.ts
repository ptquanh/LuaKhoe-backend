import { v2 as cloudinary } from 'cloudinary';

import { Module, Provider } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import cloudinaryConfig from '@configs/cloudinary.config';

import { UserModule } from '@modules/user/user.module';

import { INJECTION_TOKEN } from '@shared/constants';

import { CloudinaryController } from './cloudinary.controller';
import { CloudinaryService } from './cloudinary.service';

export const cloudinaryProvider: Provider = {
  provide: INJECTION_TOKEN.CLOUDINARY_SERVICE,
  useFactory: (config: ConfigType<typeof cloudinaryConfig>) => {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });
    return cloudinary;
  },
  inject: [cloudinaryConfig.KEY],
};

@Module({
  imports: [UserModule],
  controllers: [CloudinaryController],
  providers: [CloudinaryService, cloudinaryProvider],
  exports: [CloudinaryService, cloudinaryProvider],
})
export class CloudinaryModule {}
