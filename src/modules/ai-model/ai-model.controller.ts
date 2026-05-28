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

import { PaginationDTO } from '@shared/common/pagination.dto';
import { RequestUser } from '@shared/decorators/request-user.decorator';
import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { generateSuccessResult } from '@shared/helpers/operation-result.helper';
import { UserAuthProfile } from '@shared/interfaces';

import { CreateAiModelDto, UpdateAiModelDto } from './ai-model.dto';
import { AiModelService } from './ai-model.service';

@ApiTags('AI Models')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('ai-models')
export class AiModelController {
  constructor(private readonly aiModelService: AiModelService) {}

  @Get()
  @ApiOperation({ summary: 'Get AI models with pagination' })
  @Roles(ROLE.ADMIN)
  async getModels(@Query() dto: PaginationDTO): Promise<HttpResponse> {
    const models = await this.aiModelService.paginate(dto);
    return generateSuccessResult(models);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active AI models' })
  @Roles(ROLE.ADMIN, ROLE.FARMER)
  async getActiveModels(): Promise<HttpResponse> {
    return this.aiModelService.getActiveModels();
  }

  @Post()
  @ApiOperation({ summary: 'Upload and create new AI model (.onnx)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(ROLE.ADMIN)
  async createModel(
    @RequestUser() user: UserAuthProfile,
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreateAiModelDto,
  ): Promise<HttpResponse> {
    return this.aiModelService.uploadModel(file, data, user.id);
  }

  @Put(':id/active')
  @ApiOperation({ summary: 'Set an AI model as active (triggers hot-reload)' })
  @Roles(ROLE.ADMIN)
  async setActive(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<HttpResponse> {
    return this.aiModelService.setActive(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AI model by ID' })
  @Roles(ROLE.ADMIN)
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<HttpResponse> {
    return this.aiModelService.findById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an inactive AI model' })
  @Roles(ROLE.ADMIN)
  async deleteModel(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<HttpResponse> {
    return this.aiModelService.deleteModel(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an AI model details or replace its ONNX file',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @Roles(ROLE.ADMIN)
  async updateModel(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() data: UpdateAiModelDto,
  ): Promise<HttpResponse> {
    return this.aiModelService.updateModel(id, data, file);
  }
}
