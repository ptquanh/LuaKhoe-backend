import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserProfile } from './entities/user-profile.entity';
import { UserSocialAccount } from './entities/user-social-account.entity';
import { User } from './entities/user.entity';
import { UserProfileService } from './services/user-profile.service';
import { UserSocialAccountService } from './services/user-social-account.service';
import { UserService } from './services/user.service';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile, UserSocialAccount])],
  controllers: [UserController],
  providers: [UserService, UserSocialAccountService, UserProfileService],
  exports: [UserService, UserSocialAccountService, UserProfileService],
})
export class UserModule {}
