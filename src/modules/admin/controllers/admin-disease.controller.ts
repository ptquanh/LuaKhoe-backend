import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  CreateDiseaseDTO,
  FindOneDiseaseParamDTO,
  UpdateDiseaseDTO,
} from '@modules/disease/disease.dto';

import { PaginatedByKeywordDTO } from '@shared/common/pagination.dto';
import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { UseCallQueue } from '@shared/interceptors/call-queue.interceptor';
import { ApplyRateLimiting } from '@shared/interceptors/rate-limiting.interceptor';

import { AdminDiseaseService } from '../services/admin-disease.service';

@ApiTags('Admin Diseases')
@ApiBearerAuth()
@Controller('admin/diseases')
@UseGuards(AuthGuard, RolesGuard)
@Roles(ROLE.ADMIN)
export class AdminDiseaseController {
  constructor(private readonly adminDiseaseService: AdminDiseaseService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all diseases with pagination and search (Admin only)',
  })
  async findDiseasesForAdmin(@Query() dto: PaginatedByKeywordDTO) {
    return this.adminDiseaseService.findDiseasesForAdmin(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new disease (Admin only)' })
  @UseCallQueue()
  @ApplyRateLimiting(10)
  async createDisease(@Body() dto: CreateDiseaseDTO) {
    return this.adminDiseaseService.createDisease(dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload disease image to Cloudinary (Admin only)' })
  @UseCallQueue()
  @ApplyRateLimiting(10)
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.adminDiseaseService.uploadImage(file);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a disease by ID (Admin only)' })
  @UseCallQueue()
  @ApplyRateLimiting(10)
  async updateDisease(
    @Param() params: FindOneDiseaseParamDTO,
    @Body() dto: UpdateDiseaseDTO,
  ) {
    return this.adminDiseaseService.updateDisease(params.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a disease by ID (Admin only)' })
  @UseCallQueue()
  @ApplyRateLimiting(10)
  async deleteDisease(@Param() params: FindOneDiseaseParamDTO) {
    return this.adminDiseaseService.deleteDisease(params.id);
  }
}
