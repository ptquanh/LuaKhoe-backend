import { HttpResponse } from 'mvc-common-toolkit';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CloudinaryService } from '@modules/cloudinary/cloudinary.service';
import { FileService } from '@modules/cloudinary/file.service';

import { CLOUDINARY_FOLDER } from '@shared/constants';
import { RequestUser } from '@shared/decorators/request-user.decorator';
import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { ApplyRateLimiting } from '@shared/interceptors/rate-limiting.interceptor';
import { UserAuthProfile } from '@shared/interfaces';

import { UserProfileService } from './services/user-profile.service';
import { UserService } from './services/user.service';
import {
  GetUsersAdminDTO,
  UpdateUserProfileDTO,
  UpdateUserStatusDTO,
} from './user.dto';

@ApiBearerAuth()
@ApiTags('User')
@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(
    private readonly profileService: UserProfileService,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly fileService: FileService,
  ) {}

  @Get()
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get All Users (Admin only)',
    description: 'Retrieve users list with diagnosis count and latest province',
  })
  async getUsers(@Query() dto: GetUsersAdminDTO): Promise<HttpResponse> {
    return this.userService.getUsersForAdmin(dto);
  }

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
    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      CLOUDINARY_FOLDER.AVATARS,
    );

    await this.userService.updateByID(user.id, {
      avatarUrl: uploadResult.secure_url,
    });

    return {
      success: true,
      data: { avatarUrl: uploadResult.secure_url },
    };
  }

  @Put(':id/status')
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Update User Status (Admin only)',
    description: 'Ban or unban a user with a reason',
  })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDTO,
  ): Promise<HttpResponse> {
    return this.userService.updateUserStatusForAdmin(id, dto);
  }

  @Delete(':id')
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Delete User (Admin only)',
    description: 'Permanently delete a user and all their associated data',
  })
  async deleteUser(@Param('id') id: string): Promise<HttpResponse> {
    return this.userService.deleteUserForAdmin(id);
  }
}
