import { HttpResponse } from 'mvc-common-toolkit';

import { Injectable } from '@nestjs/common';

import { UserService } from '@modules/user/services/user.service';
import { GetUsersAdminDTO, UpdateUserStatusDTO } from '@modules/user/user.dto';

@Injectable()
export class AdminUserService {
  constructor(private readonly userService: UserService) {}

  async getUsers(dto: GetUsersAdminDTO): Promise<HttpResponse> {
    return this.userService.getUsersForAdmin(dto);
  }

  async updateUserStatus(
    id: string,
    dto: UpdateUserStatusDTO,
  ): Promise<HttpResponse> {
    return this.userService.updateUserStatusForAdmin(id, dto);
  }

  async deleteUser(id: string): Promise<HttpResponse> {
    return this.userService.deleteUserForAdmin(id);
  }
}
