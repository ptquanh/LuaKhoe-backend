import { OperationResult } from 'mvc-common-toolkit';
import { Repository } from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ERR_CODE } from '@shared/constants';
import { ROLE } from '@shared/enums';
import {
  generateNotFoundResult,
  generateSuccessResult,
} from '@shared/helpers/operation-result.helper';
import { BaseCRUDService } from '@shared/services/base-crud.service';

import { AdminProfile } from '../entities/admin-profile.entity';
import { FarmerProfile } from '../entities/farmer-profile.entity';
import { User } from '../entities/user.entity';
import { UpdateUserProfileDTO } from '../user.dto';
import { UserService } from './user.service';

@Injectable()
export class UserProfileService extends BaseCRUDService<FarmerProfile> {
  protected logger = new Logger(UserProfileService.name);

  constructor(
    @InjectRepository(FarmerProfile)
    protected readonly farmerProfileRepo: Repository<FarmerProfile>,

    @InjectRepository(AdminProfile)
    protected readonly adminProfileRepo: Repository<AdminProfile>,

    private readonly userService: UserService,
  ) {
    super(farmerProfileRepo);
  }

  public async getProfile(userId: string): Promise<OperationResult<User>> {
    const user = await this.userService.findOne(
      { id: userId },
      { relations: { farmerProfile: true, adminProfile: true } },
    );

    if (!user) {
      return generateNotFoundResult('User not found', ERR_CODE.USER_NOT_FOUND);
    }

    if (user.role === ROLE.ADMIN) {
      if (!user.adminProfile) {
        user.adminProfile = await this.adminProfileRepo.save(
          this.adminProfileRepo.create({ userId }),
        );
      }
    } else {
      if (!user.farmerProfile) {
        user.farmerProfile = await this.farmerProfileRepo.save(
          this.farmerProfileRepo.create({ userId }),
        );
      }
    }

    return generateSuccessResult(user);
  }

  public async updateProfile(
    userId: string,
    dto: UpdateUserProfileDTO,
  ): Promise<OperationResult<any>> {
    const user = await this.userService.findOne(
      { id: userId },
      { relations: { farmerProfile: true, adminProfile: true } },
    );

    if (!user) {
      return generateNotFoundResult('User not found', ERR_CODE.USER_NOT_FOUND);
    }

    if (user.role === ROLE.ADMIN) {
      let profile = user.adminProfile;
      if (!profile) {
        profile = this.adminProfileRepo.create({ userId });
      }

      // Security: strict whitelisting for admin role, dropping agricultural fields
      const allowed: Partial<AdminProfile> = {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      };

      // clean undefined fields
      Object.keys(allowed).forEach((key) => {
        if (allowed[key] === undefined) {
          delete allowed[key];
        }
      });

      Object.assign(profile, allowed);
      const savedProfile = await this.adminProfileRepo.save(profile);
      return generateSuccessResult(savedProfile);
    } else {
      let profile = user.farmerProfile;
      if (!profile) {
        profile = this.farmerProfileRepo.create({ userId });
      }

      // Whitelist fields permitted for farmers
      const allowed: Partial<FarmerProfile> = {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      };

      // clean undefined fields
      Object.keys(allowed).forEach((key) => {
        if (allowed[key] === undefined) {
          delete allowed[key];
        }
      });

      Object.assign(profile, allowed);
      const savedProfile = await this.farmerProfileRepo.save(profile);
      return generateSuccessResult(savedProfile);
    }
  }
}
