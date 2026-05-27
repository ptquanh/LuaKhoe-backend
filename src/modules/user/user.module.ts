import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GeoContextModule } from '@modules/geo-context/geo-context.module';

import { AdminProfile } from './entities/admin-profile.entity';
import { FarmerProfile } from './entities/farmer-profile.entity';
import { UserField } from './entities/user-field.entity';
import { UserSocialAccount } from './entities/user-social-account.entity';
import { User } from './entities/user.entity';
import { UserFieldService } from './services/user-field.service';
import { UserProfileService } from './services/user-profile.service';
import { UserSocialAccountService } from './services/user-social-account.service';
import { UserService } from './services/user.service';
import { UserFieldController } from './user-field.controller';
import { UserController } from './user.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      FarmerProfile,
      AdminProfile,
      UserSocialAccount,
      UserField,
    ]),
    GeoContextModule,
  ],
  controllers: [UserController, UserFieldController],
  providers: [
    UserService,
    UserSocialAccountService,
    UserProfileService,
    UserFieldService,
  ],
  exports: [
    UserService,
    UserSocialAccountService,
    UserProfileService,
    UserFieldService,
  ],
})
export class UserModule {}
