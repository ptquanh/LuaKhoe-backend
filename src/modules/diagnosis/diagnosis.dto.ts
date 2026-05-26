import { Transform, Type, plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginatedByKeywordAndDateTimeDTO } from '@shared/common/pagination.dto';

export class FieldParamsDto {
  @ApiPropertyOptional({ example: 'Bình thường' })
  @IsOptional()
  @IsString()
  water?: string;

  @ApiPropertyOptional({ example: 'Đẻ nhánh' })
  @IsOptional()
  @IsString()
  growth?: string;

  @ApiPropertyOptional({ example: 'Vừa' })
  @IsOptional()
  @IsString()
  density?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  fog?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  leafhopper?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  pesticide?: boolean;
}

export class CreateDiagnosisDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Rice leaf image file',
  })
  @IsOptional()
  image: any;

  @ApiProperty({ required: false, example: 'High humidity, after rain' })
  @IsOptional()
  @IsString()
  envDescription?: string;

  @ApiPropertyOptional({ example: 'uuid-string' })
  @IsOptional()
  @IsString()
  fieldId?: string;

  @ApiPropertyOptional({ example: 'Cần Thơ' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ example: 10.0333 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    if (
      value === undefined ||
      value === null ||
      value === 'undefined' ||
      value === 'null' ||
      value === ''
    )
      return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  gpsLat?: number;

  @ApiPropertyOptional({ example: 105.7833 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    if (
      value === undefined ||
      value === null ||
      value === 'undefined' ||
      value === 'null' ||
      value === ''
    )
      return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  gpsLng?: number;

  @ApiPropertyOptional({ type: () => FieldParamsDto })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || value === 'undefined' || value === 'null' || value === '')
      return undefined;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return plainToInstance(FieldParamsDto, parsed, {
          enableImplicitConversion: true,
        });
      } catch (e) {
        return undefined;
      }
    }
    return plainToInstance(FieldParamsDto, value, {
      enableImplicitConversion: true,
    });
  })
  @IsObject()
  @ValidateNested()
  @Type(() => FieldParamsDto)
  fieldParams?: FieldParamsDto;
}

export class GetHistoryDto extends PaginatedByKeywordAndDateTimeDTO {
  @ApiPropertyOptional({ description: 'Filter by specific disease name' })
  @IsOptional()
  @IsString()
  disease?: string;

  @ApiPropertyOptional({ description: 'Filter by feedback status' })
  @IsOptional()
  @IsString()
  feedbackStatus?: string;
}
