import { HttpResponse } from 'mvc-common-toolkit';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
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
import { OptionalAuthGuard } from '@shared/guards/optional-auth.guard';
import { UseCallQueue } from '@shared/interceptors/call-queue.interceptor';
import { ApplyRateLimiting } from '@shared/interceptors/rate-limiting.interceptor';
import { UserAuthProfile } from '@shared/interfaces';

import { UserProfileService } from '../services/user-profile.service';
import { UserService } from '../services/user.service';
import {
  SearchUsersQueryDTO,
  UpdateUserProfileDTO,
  UsernameParamDTO,
} from '../user.dto';

@ApiBearerAuth()
@ApiTags('User')
@Controller('users')
export class UserController {
  constructor(
    private readonly profileService: UserProfileService,
    private readonly userService: UserService,
    private readonly storageService: StorageService,
    private readonly fileService: FileService,
  ) {}

  @Get('username/:username')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Get Profile by Username',
    description: 'Retrieve public user profile details by username',
  })
  async getProfileByUsername(
    @Param() dto: UsernameParamDTO,
  ): Promise<HttpResponse> {
    const user = await this.userService.findByUsername(dto.username);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng ${dto.username}`);
    }
    // Omit password from output just in case
    if (user.password) {
      delete user.password;
    }
    return {
      success: true,
      data: user,
    };
  }

  @Get('search')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Search Users',
    description: 'Search other users for mentions/tagging',
  })
  async searchUsers(@Query() dto: SearchUsersQueryDTO): Promise<HttpResponse> {
    return this.userService.searchUsers(dto.query);
  }

  @Get(['me', 'profile'])
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Update Profile',
    description: 'Update user profile details',
  })
  @ApplyRateLimiting(5)
  @UseCallQueue()
  async updateProfile(
    @RequestUser() user: UserAuthProfile,
    @Body() dto: UpdateUserProfileDTO,
  ): Promise<HttpResponse> {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Patch(['me/avatar', 'profile/avatar'])
  @UseGuards(AuthGuard)
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
  @UseCallQueue()
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

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Get Public Profile by ID',
    description: 'Retrieve public user profile details by ID',
  })
  async getProfileById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<HttpResponse> {
    const user = await this.userService.findOne(
      { id },
      { relations: { farmerProfile: true, adminProfile: true } },
    );
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id}`);
    }
    if (user.password) {
      delete user.password;
    }
    return {
      success: true,
      data: user,
    };
  }
}
