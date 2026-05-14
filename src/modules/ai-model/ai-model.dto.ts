import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAiModelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  versionName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  releaseNotes?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
