import { HttpResponse } from 'mvc-common-toolkit';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { FileService } from '@modules/cloudinary/file.service';
import { StorageService, StorageType } from '@modules/storage/storage.service';

import { getStorageFolder } from '@shared/constants';
import { RequestUser } from '@shared/decorators/request-user.decorator';
import { AuthGuard } from '@shared/guards/auth.guard';
import { ApplyRateLimiting } from '@shared/interceptors/rate-limiting.interceptor';
import { UserAuthProfile } from '@shared/interfaces';

import { UserProfileService } from './services/user-profile.service';
import { UserService } from './services/user.service';
import { UpdateUserProfileDTO } from './user.dto';

@ApiBearerAuth()
@ApiTags('User')
@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(
    private readonly profileService: UserProfileService,
    private readonly userService: UserService,
    private readonly storageService: StorageService,
    private readonly fileService: FileService,
  ) {}

  @Get(['me', 'profile'])
  @ApiOperation({
    summary: 'Get My Profile',
    description: 'Retrieve current user profile',
  })
  async getProfile(
    @RequestUser() user: UserAuthProfile,
  ): Promise<HttpResponse> {
    return this.profileService.getProfile(user.id);
  }

  @Put(['me', 'profile'])
  @ApiOperation({
    summary: 'Update Profile',
    description: 'Update user profile details',
  })
  @ApplyRateLimiting(5)
  async updateProfile(
    @RequestUser() user: UserAuthProfile,
    @Body() dto: UpdateUserProfileDTO,
  ): Promise<HttpResponse> {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Patch(['me/avatar', 'profile/avatar'])
  @ApiOperation({
    summary: 'Upload User Avatar',
    description: 'Upload and update logged-in user avatar',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new BadRequestException(
              'Chỉ cho phép tải lên các tệp hình ảnh (JPG, JPEG, PNG, WEBP)!',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApplyRateLimiting(5)
  async uploadAvatar(
    @RequestUser() user: UserAuthProfile,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<HttpResponse> {
    await this.fileService.validateImageSize(file);
    const avatarUrl = await this.storageService.uploadFile(
      file,
      getStorageFolder().AVATARS,
      StorageType.CLOUDINARY,
    );

    await this.userService.updateByID(user.id, {
      avatarUrl,
    });

    return {
      success: true,
      data: { avatarUrl },
    };
  }
}
