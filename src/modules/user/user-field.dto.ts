import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserFieldDto {
  @ApiProperty({ example: 'Ruộng Nhà Lớn' })
  @IsString()
  @MaxLength(100)
  fieldName: string;

  @ApiPropertyOptional({ example: 'Chợ Mới, An Giang' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({ example: 10.3759 })
  @IsNumber()
  gpsLat: number;

  @ApiProperty({ example: 105.4246 })
  @IsNumber()
  gpsLng: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateUserFieldDto {
  @ApiPropertyOptional({ example: 'Ruộng Nhà Lớn' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fieldName?: string;

  @ApiPropertyOptional({ example: 'Chợ Mới, An Giang' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 10.3759 })
  @IsOptional()
  @IsNumber()
  gpsLat?: number;

  @ApiPropertyOptional({ example: 105.4246 })
  @IsOptional()
  @IsNumber()
  gpsLng?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
