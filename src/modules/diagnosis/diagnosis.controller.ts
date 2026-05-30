import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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

import { RequestUser } from '@shared/decorators/request-user.decorator';
import { AuthGuard } from '@shared/guards/auth.guard';
import { UserAuthProfile } from '@shared/interfaces';

import { CreateDiagnosisDto, GetHistoryDto } from './diagnosis.dto';
import { DiagnosisService } from './services/diagnosis.service';

@ApiTags('Diagnosis')
@ApiBearerAuth()
@Controller('diagnosis')
@UseGuards(AuthGuard)
export class DiagnosisController {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  @Post('predict')
  @ApiOperation({ summary: 'Predict disease from uploaded leaf image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async predict(
    @RequestUser() user: UserAuthProfile,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDiagnosisDto,
  ) {
    return this.diagnosisService.createDiagnosis(user.id, dto, file);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user diagnosis history' })
  async getHistory(
    @RequestUser() user: UserAuthProfile,
    @Query() dto: GetHistoryDto,
  ) {
    return this.diagnosisService.getUserHistory(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed diagnosis by ID' })
  async getById(@Param('id') id: string) {
    return this.diagnosisService.getById(id);
  }

  @Post(':id/supplement')
  @ApiOperation({
    summary: 'Submit close-up supplementary image for weighted re-scoring',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async uploadSupplement(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.diagnosisService.addSupplementaryImage(id, file);
  }
}
