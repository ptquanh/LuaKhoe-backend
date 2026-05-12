import { OperationResult } from 'mvc-common-toolkit';
import { Repository } from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ERR_CODE } from '@shared/constants';
import {
  generateNotFoundResult,
  generateSuccessResult,
} from '@shared/helpers/operation-result.helper';
import { BaseCRUDService } from '@shared/services/base-crud.service';

import { UserProfile } from '../entities/user-profile.entity';
import { User } from '../entities/user.entity';
import { UpdateUserProfileDTO } from '../user.dto';
import { UserService } from './user.service';

@Injectable()
export class UserProfileService extends BaseCRUDService<UserProfile> {
  protected logger = new Logger(UserProfileService.name);

  constructor(
    @InjectRepository(UserProfile)
    protected repo: Repository<UserProfile>,

    private readonly userService: UserService,
  ) {
    super(repo);
  }

  public async getProfile(userId: string): Promise<OperationResult<User>> {
    const user = await this.userService.findOne(
      { id: userId },
      { relations: { profile: true } },
    );

    if (!user) {
      return generateNotFoundResult('User not found', ERR_CODE.USER_NOT_FOUND);
    }

    return generateSuccessResult(user);
  }

  public async updateProfile(
    userId: string,
    dto: UpdateUserProfileDTO,
  ): Promise<OperationResult<UserProfile>> {
    const user = await this.userService.findOne(
      { id: userId },
      { relations: { profile: true } },
    );

    if (!user) {
      return generateNotFoundResult('User not found', ERR_CODE.USER_NOT_FOUND);
    }

    let profile = user.profile;

    if (!profile) {
      profile = this.repo.create({
        userId,
      });
    }

    Object.assign(profile, dto);

    await this.create(profile);

    return generateSuccessResult();
  }
}
