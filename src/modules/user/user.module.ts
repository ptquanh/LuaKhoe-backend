import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserField } from './entities/user-field.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserSocialAccount } from './entities/user-social-account.entity';
import { User } from './entities/user.entity';
import { UserFieldService } from './services/user-field.service';
import { UserProfileService } from './services/user-profile.service';
import { UserSocialAccountService } from './services/user-social-account.service';
import { UserService } from './services/user.service';
import { UserController } from './user.controller';
import { UserFieldController } from './user-field.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, UserSocialAccount, UserField]),
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
