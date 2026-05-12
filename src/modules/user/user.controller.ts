import { HttpResponse } from 'mvc-common-toolkit';

import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequestUser } from '@shared/decorators/request-user.decorator';
import { AuthGuard } from '@shared/guards/auth.guard';
import { ApplyRateLimiting } from '@shared/interceptors/rate-limiting.interceptor';
import { UserAuthProfile } from '@shared/interfaces';

import { UserProfileService } from './services/user-profile.service';
import { UpdateUserProfileDTO } from './user.dto';

@ApiBearerAuth()
@ApiTags('User')
@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly profileService: UserProfileService) {}

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
}
