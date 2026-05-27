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

import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { generateSuccessResult } from '@shared/helpers/operation-result.helper';

import {
  DocumentFilterDto,
  GetAdvisoryDto,
  SeedNutritionDocDto,
} from './nutrition.dto';
import { NutritionService } from './nutrition.service';

@ApiTags('Nutritions')
@ApiBearerAuth()
@Controller('nutrition')
@UseGuards(AuthGuard)
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get()
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get paginated nutrition knowledge documents (Admin only)',
  })
  async getPaginated(@Query() query: DocumentFilterDto) {
    const result = await this.nutritionService.getChunks(query);
    return generateSuccessResult(result);
  }

  @Post()
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Create a single nutrition knowledge document (Admin only)',
  })
  async createChunk(@Body() dto: SeedNutritionDocDto) {
    const result = await this.nutritionService.uploadDocument(
      dto.content,
      dto.source,
      dto.metadata || {},
    );
    return generateSuccessResult(result);
  }

  @Post('upload')
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload and parse a document file (PDF or TXT) (Admin only)',
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const result = await this.nutritionService.uploadDocumentFile(file);
    return generateSuccessResult(result);
  }

  @Delete(':id')
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Delete a nutrition knowledge document by ID (Admin only)',
  })
  async deleteChunk(@Param('id') id: string) {
    await this.nutritionService.deleteByID(id);
    return generateSuccessResult({ message: 'Deleted successfully' });
  }

  @Post('seed')
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Seed nutrition knowledge documents (Admin only)' })
  @ApiBody({ type: [SeedNutritionDocDto] })
  async seed(
    @Body(new ParseArrayPipe({ items: SeedNutritionDocDto }))
    documents: SeedNutritionDocDto[],
  ) {
    return this.nutritionService.seedKnowledge(documents);
  }

  @Post('advisory')
  @ApiOperation({ summary: 'Get nutrition advisory for a disease' })
  async getAdvisory(@Body() dto: GetAdvisoryDto) {
    return this.nutritionService.getAdvisory(dto.diseaseName, dto.context);
  }
}
