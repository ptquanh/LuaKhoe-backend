import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { BaseCRUDService } from '@shared/services/base-crud.service';

import { UserSocialAccount } from '../entities/user-social-account.entity';

@Injectable()
export class UserSocialAccountService extends BaseCRUDService<UserSocialAccount> {
  constructor(
    @InjectRepository(UserSocialAccount)
    protected repo: Repository<UserSocialAccount>,
  ) {
    super(repo);
  }
}
