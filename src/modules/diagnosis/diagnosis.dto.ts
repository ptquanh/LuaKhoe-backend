import { IsNumber, IsOptional, IsString } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginatedByKeywordAndDateTimeDTO } from '@shared/common/pagination.dto';

export class CreateDiagnosisDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Rice leaf image file',
  })
  image: any;

  @ApiProperty({ required: false, example: 10.762622 })
  @IsOptional()
  @IsNumber()
  gpsLat?: number;

  @ApiProperty({ required: false, example: 106.660172 })
  @IsOptional()
  @IsNumber()
  gpsLng?: number;

  @ApiProperty({ required: false, example: 'High humidity, after rain' })
  @IsOptional()
  @IsString()
  envDescription?: string;
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
