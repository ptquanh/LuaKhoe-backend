import { HttpResponse } from 'mvc-common-toolkit';

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  CreateAiModelDto,
  UpdateAiModelDto,
} from '@modules/ai-model/ai-model.dto';

import { PaginationDTO } from '@shared/common/pagination.dto';
import { BulkDeleteDto } from '@shared/common/bulk-delete.dto';
import { RequestUser } from '@shared/decorators/request-user.decorator';
import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { UseCallQueue } from '@shared/interceptors/call-queue.interceptor';
import { ApplyRateLimiting } from '@shared/interceptors/rate-limiting.interceptor';
import { UserAuthProfile } from '@shared/interfaces';

import { AdminAiModelService } from '../services/admin-ai-model.service';

@ApiTags('Admin AI Models')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('admin/ai-models')
@Roles(ROLE.ADMIN)
export class AdminAiModelController {
  constructor(private readonly adminAiModelService: AdminAiModelService) {}

  @Get()
  @ApiOperation({ summary: 'Get AI models with pagination (Admin only)' })
  async getModels(@Query() dto: PaginationDTO): Promise<HttpResponse> {
    return this.adminAiModelService.getModels(dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Upload and create new AI model (.onnx) (Admin only)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @UseCallQueue()
  @ApplyRateLimiting(3)
  async createModel(
    @RequestUser() user: UserAuthProfile,
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreateAiModelDto,
  ): Promise<HttpResponse> {
    return this.adminAiModelService.createModel(file, data, user.id);
  }

  @Put(':id/active')
  @ApiOperation({
    summary: 'Set an AI model as active (triggers hot-reload) (Admin only)',
  })
  @UseCallQueue()
  @ApplyRateLimiting(3)
  async setActive(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<HttpResponse> {
    return this.adminAiModelService.setActive(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AI model by ID (Admin only)' })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<HttpResponse> {
    return this.adminAiModelService.getById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inactive AI model (Admin only)' })
  @UseCallQueue()
  @ApplyRateLimiting(5)
  async deleteModel(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<HttpResponse> {
    return this.adminAiModelService.deleteModel(id);
  }

  @Delete()
  @ApiOperation({ summary: 'Bulk Delete inactive AI models (Admin only)' })
  @UseCallQueue()
  @ApplyRateLimiting(5)
  async bulkDeleteModels(
    @Body() dto: BulkDeleteDto,
  ): Promise<HttpResponse> {
    return this.adminAiModelService.bulkDeleteModels(dto.ids);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an AI model details or replace its ONNX file (Admin only)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @UseCallQueue()
  @ApplyRateLimiting(5)
  async updateModel(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() data: UpdateAiModelDto,
  ): Promise<HttpResponse> {
    return this.adminAiModelService.updateModel(id, data, file);
  }
}
