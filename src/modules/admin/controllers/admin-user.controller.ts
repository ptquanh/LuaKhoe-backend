import { HttpResponse } from 'mvc-common-toolkit';

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { GetUsersAdminDTO, UpdateUserStatusDTO } from '@modules/user/user.dto';

import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';

import { AdminUserService } from '../services/admin-user.service';

@ApiBearerAuth()
@ApiTags('Admin Users')
@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(ROLE.ADMIN)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  @ApiOperation({
    summary: 'Get All Users (Admin only)',
    description: 'Retrieve users list with diagnosis count and latest province',
  })
  async getUsers(@Query() dto: GetUsersAdminDTO): Promise<HttpResponse> {
    return this.adminUserService.getUsers(dto);
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update User Status (Admin only)',
    description: 'Ban or unban a user with a reason',
  })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDTO,
  ): Promise<HttpResponse> {
    return this.adminUserService.updateUserStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete User (Admin only)',
    description: 'Permanently delete a user and all their associated data',
  })
  async deleteUser(@Param('id') id: string): Promise<HttpResponse> {
    return this.adminUserService.deleteUser(id);
  }
}
