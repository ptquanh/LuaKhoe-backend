import { HttpResponse } from 'mvc-common-toolkit';

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequestUser } from '@shared/decorators/request-user.decorator';
import { AuthGuard } from '@shared/guards/auth.guard';
import { ApplyRateLimiting } from '@shared/interceptors/rate-limiting.interceptor';
import { UserAuthProfile } from '@shared/interfaces';

import { UserFieldService } from '../services/user-field.service';
import { CreateUserFieldDto, UpdateUserFieldDto } from '../user-field.dto';

@ApiBearerAuth()
@ApiTags('UserField')
@Controller('user-fields')
@UseGuards(AuthGuard)
export class UserFieldController {
  constructor(private readonly userFieldService: UserFieldService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all user fields',
    description:
      'Retrieve all field locations registered by the authenticated farmer',
  })
  async getUserFields(
    @RequestUser() user: UserAuthProfile,
  ): Promise<HttpResponse> {
    return this.userFieldService.getUserFields(user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a user field',
    description:
      'Register a new field location with custom name, address, and coordinates',
  })
  @ApplyRateLimiting(5)
  async createUserField(
    @RequestUser() user: UserAuthProfile,
    @Body() dto: CreateUserFieldDto,
  ): Promise<HttpResponse> {
    return this.userFieldService.createUserField(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a user field',
    description:
      'Update custom name, address, coordinates, or default status of a field',
  })
  @ApplyRateLimiting(5)
  async updateUserField(
    @RequestUser() user: UserAuthProfile,
    @Param('id') id: string,
    @Body() dto: UpdateUserFieldDto,
  ): Promise<HttpResponse> {
    return this.userFieldService.updateUserField(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a user field',
    description: 'Delete a field location by its ID',
  })
  async deleteUserField(
    @RequestUser() user: UserAuthProfile,
    @Param('id') id: string,
  ): Promise<HttpResponse> {
    return this.userFieldService.deleteUserField(user.id, id);
  }
}
