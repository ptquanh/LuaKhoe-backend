import { isEmail } from 'class-validator';
import { HttpResponse, OperationResult } from 'mvc-common-toolkit';
import { Any, ILike, In, Repository } from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Diagnosis } from '@modules/diagnosis/entities/diagnosis.entity';

import { ERR_CODE } from '@shared/constants';
import { ENTITY_STATUS, ROLE } from '@shared/enums';
import {
  generateConflictResult,
  generateNotFoundResult,
  generateSuccessResult,
} from '@shared/helpers/operation-result.helper';
import { BaseCRUDService } from '@shared/services/base-crud.service';

import { User } from '../entities/user.entity';
import {
  GetUsersAdminDTO,
  UpdateUserStatusDTO,
  VerifyUniquenessUserDTO,
} from '../user.dto';

@Injectable()
export class UserService extends BaseCRUDService<User> {
  protected logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    protected repo: Repository<User>,
  ) {
    super(repo);
  }

  public async verifyUniquenessUser(
    dto: Partial<VerifyUniquenessUserDTO>,
  ): Promise<OperationResult> {
    const { email, username } = dto;

    if (email) {
      const count = await this.count({ email });

      if (count > 0) {
        return generateConflictResult(
          'Email already exists',
          ERR_CODE.EMAIL_ALREADY_EXISTS,
        );
      }
    }

    if (username) {
      const count = await this.count({ username });

      if (count > 0) {
        return generateConflictResult(
          'Username already exists',
          ERR_CODE.USERNAME_ALREADY_EXISTS,
        );
      }
    }

    return generateSuccessResult();
  }

  public async findUserByEmailOrUsername(usernameOrEmail: string) {
    const filter = isEmail(usernameOrEmail)
      ? { email: usernameOrEmail }
      : { username: usernameOrEmail };

    const user = await this.findOne(filter);

    return user;
  }

  public async getUsersForAdmin(dto: GetUsersAdminDTO): Promise<HttpResponse> {
    const limit = dto.limit ? parseInt(dto.limit as any, 10) : 10;
    const offset = dto.offset ? parseInt(dto.offset as any, 10) : 0;

    let whereFilter: any = {};
    if (dto.keyword) {
      const keyword = `%${dto.keyword}%`;
      const baseConditions = [
        { username: ILike(keyword) },
        { email: ILike(keyword) },
        { farmerProfile: { firstName: ILike(keyword) } },
        { farmerProfile: { lastName: ILike(keyword) } },
        { adminProfile: { firstName: ILike(keyword) } },
        { adminProfile: { lastName: ILike(keyword) } },
      ];

      whereFilter = baseConditions.map((cond) => {
        const result: any = { ...cond };
        if (dto.role) result.role = dto.role;
        if (dto.status) result.status = dto.status;
        return result;
      });
    } else {
      if (dto.role) whereFilter.role = dto.role;
      if (dto.status) whereFilter.status = dto.status;
    }

    const [users, total] = await this.repo.findAndCount({
      where: whereFilter,
      relations: ['farmerProfile', 'adminProfile'],
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });

    if (users.length === 0) {
      return generateSuccessResult({
        rows: [],
        total: 0,
        limit,
        offset,
      });
    }

    const userIds = users.map((u) => u.id);

    // Get count of diagnoses
    const countResults = await this.repo.manager
      .getRepository(Diagnosis)
      .createQueryBuilder('d')
      .select('d.userId', 'userId')
      .addSelect('COUNT(d.id)', 'count')
      .where('d.userId IN (:...userIds)', { userIds })
      .groupBy('d.userId')
      .getRawMany();

    const countMap = new Map<string, number>();
    for (const c of countResults) {
      countMap.set(c.userId, parseInt(c.count, 10));
    }

    // Get latest province of diagnoses
    const diagnoses = await this.repo.manager.getRepository(Diagnosis).find({
      where: { userId: Any(userIds) },
      order: { createdAt: 'DESC' },
      select: ['userId', 'province'],
    });

    const provinceMap = new Map<string, string>();
    for (const d of diagnoses) {
      if (d.province && !provinceMap.has(d.userId)) {
        provinceMap.set(d.userId, d.province);
      }
    }

    const rows = users.map((u) => {
      const profile = u.role === ROLE.ADMIN ? u.adminProfile : u.farmerProfile;
      const name =
        [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
        u.username;

      return {
        id: u.id,
        name,
        email: u.email,
        username: u.username,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        uploads: countMap.get(u.id) || 0,
        province: provinceMap.get(u.id) || '',
        metadata: u.metadata,
      };
    });

    return generateSuccessResult({
      rows,
      total,
      limit,
      offset,
    });
  }

  public async updateUserStatusForAdmin(
    id: string,
    dto: UpdateUserStatusDTO,
  ): Promise<HttpResponse> {
    const user = await this.findByID(id);
    if (!user) {
      return generateNotFoundResult(`User ${id} not found`);
    }

    const defaultReason =
      dto.status === ENTITY_STATUS.SUSPENDED
        ? 'Bị khóa bởi quản trị viên'
        : 'Kích hoạt bởi quản trị viên';

    user.status = dto.status;
    user.metadata = {
      ...(user.metadata || {}),
      statusReason: dto.reason || defaultReason,
      statusUpdatedAt: new Date().toISOString(),
    };

    const saved = await this.repo.save(user);
    return generateSuccessResult(saved);
  }

  public async deleteUserForAdmin(id: string): Promise<HttpResponse> {
    const user = await this.findByID(id);
    if (!user) {
      return generateNotFoundResult(`User ${id} not found`);
    }

    // Hard delete user from the repository using the inherited base method
    // (This triggers DB cascading ON DELETE CASCADE deletes for other related tables)
    await this.hardDeleteByID(id);

    return generateSuccessResult({ id, message: 'User deleted successfully' });
  }

  public async searchUsers(query: string): Promise<HttpResponse> {
    const keyword = `%${query || ''}%`;
    const users = await this.repo.find({
      where: [
        { username: ILike(keyword) },
        { farmerProfile: { firstName: ILike(keyword) } },
        { farmerProfile: { lastName: ILike(keyword) } },
      ],
      relations: ['farmerProfile', 'adminProfile'],
      take: 10,
    });

    const data = users.map((u) => {
      const name =
        [u.farmerProfile?.lastName, u.farmerProfile?.firstName]
          .filter(Boolean)
          .join(' ') || u.username;
      return {
        id: u.id,
        username: u.username,
        displayName: name,
        email: u.email,
        firstName:
          u.farmerProfile?.firstName || u.adminProfile?.firstName || null,
        lastName: u.farmerProfile?.lastName || u.adminProfile?.lastName || null,
      };
    });

    return generateSuccessResult(data);
  }

  public async findUsersByUsernames(usernames: string[]): Promise<User[]> {
    if (!usernames || usernames.length === 0) return [];
    return this.repo.find({
      where: { username: In(usernames) },
    });
  }

  public async findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({
      where: { username },
      relations: ['farmerProfile', 'adminProfile'],
    });
  }
}
