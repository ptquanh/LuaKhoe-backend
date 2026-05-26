import { HttpResponse } from 'mvc-common-toolkit';

import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaginatedByKeywordDTO } from '@shared/common/pagination.dto';
import { RequestUser } from '@shared/decorators/request-user.decorator';
import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { ApplyRateLimiting } from '@shared/interceptors/rate-limiting.interceptor';
import { UserAuthProfile } from '@shared/interfaces';

import { UserProfileService } from './services/user-profile.service';
import { UserService } from './services/user.service';
import { UpdateUserProfileDTO, UpdateUserStatusDTO } from './user.dto';

@ApiBearerAuth()
@ApiTags('User')
@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(
    private readonly profileService: UserProfileService,
    private readonly userService: UserService,
  ) {}

  @Get()
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get All Users (Admin only)',
    description: 'Retrieve users list with diagnosis count and latest province',
  })
  async getUsers(@Query() dto: PaginatedByKeywordDTO): Promise<HttpResponse> {
    return this.userService.getUsersForAdmin(dto);
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get My Profile',
    description: 'Retrieve current user profile',
  })
  async getProfile(
    @RequestUser() user: UserAuthProfile,
  ): Promise<HttpResponse> {
    return this.profileService.getProfile(user.id);
  }

  @Put('profile')
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
}
