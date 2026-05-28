import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateAiModelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  versionName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  filePath?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  releaseNotes?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAiModelDto extends PartialType(CreateAiModelDto) {}
