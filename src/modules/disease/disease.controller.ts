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

import { CloudinaryService } from '@modules/cloudinary/cloudinary.service';

import { PaginatedByKeywordDTO } from '@shared/common/pagination.dto';
import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { generateSuccessResult } from '@shared/helpers/operation-result.helper';

import { CreateDiseaseDTO, UpdateDiseaseDTO } from './disease.dto';
import { DiseaseService } from './disease.service';

@ApiTags('Diseases')
@ApiBearerAuth()
@Controller('diseases')
@UseGuards(AuthGuard)
export class DiseaseController {
  constructor(
    private readonly diseaseService: DiseaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all visible diseases' })
  async findAll() {
    return this.diseaseService.findAllDiseases();
  }

  @Get('admin')
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get all diseases with pagination and search (Admin only)',
  })
  async findDiseasesForAdmin(@Query() dto: PaginatedByKeywordDTO) {
    return this.diseaseService.findDiseasesForAdmin(dto);
  }

  @Post()
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new disease (Admin only)' })
  async createDisease(@Body() dto: CreateDiseaseDTO) {
    return this.diseaseService.createDiseases(dto);
  }

  @Post('upload')
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload disease image to Cloudinary (Admin only)' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      'luakhoe/diseases',
    );
    return generateSuccessResult({ imageUrl: uploadResult.secure_url });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed disease by ID' })
  async findById(@Param('id') id: string) {
    return this.diseaseService.findById(id);
  }

  @Put(':id')
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a disease by ID (Admin only)' })
  async updateDisease(@Param('id') id: string, @Body() dto: UpdateDiseaseDTO) {
    return this.diseaseService.update(id, dto);
  }

  @Delete(':id')
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete a disease by ID (Admin only)' })
  async deleteDisease(@Param('id') id: string) {
    await this.diseaseService.deleteByID(id);
    return generateSuccessResult(null, 'Disease deleted successfully');
  }
}
