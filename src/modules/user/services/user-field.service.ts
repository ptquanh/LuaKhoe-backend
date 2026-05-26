import { OperationResult } from 'mvc-common-toolkit';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ERR_CODE } from '@shared/constants';
import { reverseGeocode } from '@shared/helpers/geocoding.helper';
import {
  generateNotFoundResult,
  generateSuccessResult,
} from '@shared/helpers/operation-result.helper';
import { BaseCRUDService } from '@shared/services/base-crud.service';

import { UserField } from '../entities/user-field.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { CreateUserFieldDto, UpdateUserFieldDto } from '../user-field.dto';

@Injectable()
export class UserFieldService extends BaseCRUDService<UserField> {
  protected logger = new Logger(UserFieldService.name);

  constructor(
    @InjectRepository(UserField)
    protected repo: Repository<UserField>,

    private readonly dataSource: DataSource,
  ) {
    super(repo);
  }

  public async getUserFields(
    userId: string,
  ): Promise<OperationResult<UserField[]>> {
    const fields = await this.repo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
    return generateSuccessResult(fields);
  }

  public async createUserField(
    userId: string,
    dto: CreateUserFieldDto,
  ): Promise<OperationResult<UserField>> {
    const existingCount = await this.repo.count({ where: { userId } });
    const isFirstField = existingCount === 0;
    const shouldBeDefault = dto.isDefault || isFirstField;

    let savedField: UserField;

    if (shouldBeDefault) {
      await this.dataSource.transaction(async (manager) => {
        const fieldRepo = manager.getRepository(UserField);

        // 1. Set all other fields of this user to non-default
        await fieldRepo.update({ userId }, { isDefault: false });

        // 2. Save the new default field
        const newField = fieldRepo.create({
          ...dto,
          userId,
          isDefault: true,
        });
        savedField = await fieldRepo.save(newField);

        // 3. Sync coordinates and geocoded province to UserProfile
        await this.syncProfileDefaultLocation(
          manager,
          userId,
          savedField.gpsLat,
          savedField.gpsLng,
        );
      });
    } else {
      const newField = this.repo.create({
        ...dto,
        userId,
        isDefault: false,
      });
      savedField = await this.repo.save(newField);
    }

    return generateSuccessResult(savedField);
  }

  public async updateUserField(
    userId: string,
    id: string,
    dto: UpdateUserFieldDto,
  ): Promise<OperationResult<UserField>> {
    const field = await this.findOne({ id, userId });
    if (!field) {
      return generateNotFoundResult('Không tìm thấy ruộng', ERR_CODE.NOT_FOUND);
    }

    let updatedField: UserField;

    const isTogglingDefaultToTrue = dto.isDefault === true && !field.isDefault;
    const isTogglingDefaultToFalse = dto.isDefault === false && field.isDefault;
    const isUpdatingCoordsOfDefault =
      field.isDefault && (dto.gpsLat !== undefined || dto.gpsLng !== undefined);

    if (isTogglingDefaultToTrue) {
      await this.dataSource.transaction(async (manager) => {
        const fieldRepo = manager.getRepository(UserField);

        // 1. Set all other fields to non-default
        await fieldRepo.update({ userId }, { isDefault: false });

        // 2. Update current field to default and apply other updates
        Object.assign(field, dto, { isDefault: true });
        updatedField = await fieldRepo.save(field);

        // 3. Sync to profile
        await this.syncProfileDefaultLocation(
          manager,
          userId,
          updatedField.gpsLat,
          updatedField.gpsLng,
        );
      });
    } else if (isTogglingDefaultToFalse) {
      // Find another field to promote
      await this.dataSource.transaction(async (manager) => {
        const fieldRepo = manager.getRepository(UserField);

        // Update current field to non-default first
        Object.assign(field, dto, { isDefault: false });
        updatedField = await fieldRepo.save(field);

        // Find oldest remaining field
        const alternativeField = await fieldRepo.findOne({
          where: { userId },
          order: { createdAt: 'ASC' },
        });

        if (alternativeField) {
          alternativeField.isDefault = true;
          await fieldRepo.save(alternativeField);

          await this.syncProfileDefaultLocation(
            manager,
            userId,
            alternativeField.gpsLat,
            alternativeField.gpsLng,
          );
        } else {
          // No fields remain
          await this.syncProfileDefaultLocation(manager, userId, null, null);
        }
      });
    } else if (isUpdatingCoordsOfDefault) {
      await this.dataSource.transaction(async (manager) => {
        const fieldRepo = manager.getRepository(UserField);

        Object.assign(field, dto);
        updatedField = await fieldRepo.save(field);

        await this.syncProfileDefaultLocation(
          manager,
          userId,
          updatedField.gpsLat,
          updatedField.gpsLng,
        );
      });
    } else {
      // Regular updates, no default change
      Object.assign(field, dto);
      updatedField = await this.repo.save(field);
    }

    return generateSuccessResult(updatedField);
  }

  public async deleteUserField(
    userId: string,
    id: string,
  ): Promise<OperationResult<void>> {
    const field = await this.findOne({ id, userId });
    if (!field) {
      return generateNotFoundResult('Không tìm thấy ruộng', ERR_CODE.NOT_FOUND);
    }

    if (field.isDefault) {
      await this.dataSource.transaction(async (manager) => {
        const fieldRepo = manager.getRepository(UserField);

        // Delete the default field
        await fieldRepo.delete(id);

        // Query oldest remaining field to promote
        const alternativeField = await fieldRepo.findOne({
          where: { userId },
          order: { createdAt: 'ASC' },
        });

        if (alternativeField) {
          alternativeField.isDefault = true;
          await fieldRepo.save(alternativeField);

          await this.syncProfileDefaultLocation(
            manager,
            userId,
            alternativeField.gpsLat,
            alternativeField.gpsLng,
          );
        } else {
          // No fields remain for this user
          await this.syncProfileDefaultLocation(manager, userId, null, null);
        }
      });
    } else {
      await this.repo.delete(id);
    }

    return generateSuccessResult();
  }

  private async syncProfileDefaultLocation(
    manager: EntityManager,
    userId: string,
    lat: number | null,
    lng: number | null,
  ): Promise<void> {
    const userProfileRepo = manager.getRepository(UserProfile);
    let profile = await userProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = userProfileRepo.create({ userId });
    }

    if (lat === null || lng === null) {
      profile.defaultGpsLat = null;
      profile.defaultGpsLng = null;
      profile.defaultProvince = null;
    } else {
      profile.defaultGpsLat = lat;
      profile.defaultGpsLng = lng;
      try {
        const province = await reverseGeocode(lat, lng);
        profile.defaultProvince = province || null;
      } catch (err) {
        this.logger.error(
          `Error resolving province for coordinates (${lat}, ${lng}): ${err}`,
        );
        profile.defaultProvince = null;
      }
    }

    await userProfileRepo.save(profile);
  }
}
