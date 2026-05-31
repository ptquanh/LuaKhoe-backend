import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  DocumentFilterDto,
  SeedNutritionDocDto,
} from '@modules/nutrition/nutrition.dto';

import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { generateSuccessResult } from '@shared/helpers/operation-result.helper';
import { UseCallQueue } from '@shared/interceptors/call-queue.interceptor';
import { ApplyRateLimiting } from '@shared/interceptors/rate-limiting.interceptor';

import { AdminNutritionService } from '../services/admin-nutrition.service';

@ApiTags('Admin Nutrition')
@ApiBearerAuth()
@Controller('admin/nutrition')
@UseGuards(AuthGuard, RolesGuard)
@Roles(ROLE.ADMIN)
export class AdminNutritionController {
  constructor(private readonly adminNutritionService: AdminNutritionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get paginated nutrition knowledge documents (Admin only)',
  })
  async getPaginated(@Query() query: DocumentFilterDto) {
    const result = await this.adminNutritionService.getChunks(query);
    return generateSuccessResult(result);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a single nutrition knowledge document (Admin only)',
  })
  @UseCallQueue()
  @ApplyRateLimiting(10)
  async createChunk(@Body() dto: SeedNutritionDocDto) {
    const result = await this.adminNutritionService.uploadDocument(
      dto.content,
      dto.source,
      dto.metadata || {},
    );
    return generateSuccessResult(result);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload and parse a document file (PDF or TXT) (Admin only)',
  })
  @UseCallQueue()
  @ApplyRateLimiting(5)
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const result = await this.adminNutritionService.uploadDocumentFile(file);
    return generateSuccessResult(result);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a nutrition knowledge document by ID (Admin only)',
  })
  @UseCallQueue()
  @ApplyRateLimiting(10)
  async deleteChunk(@Param('id') id: string) {
    await this.adminNutritionService.deleteByID(id);
    return generateSuccessResult({ message: 'Deleted successfully' });
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed nutrition knowledge documents (Admin only)' })
  @ApiBody({ type: [SeedNutritionDocDto] })
  @UseCallQueue()
  @ApplyRateLimiting(3)
  async seed(
    @Body(new ParseArrayPipe({ items: SeedNutritionDocDto }))
    documents: SeedNutritionDocDto[],
  ) {
    return this.adminNutritionService.seedKnowledge(documents);
  }
}
