import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDiseaseDTO {
  @ApiProperty({ example: 'Bệnh đạo ôn' })
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiPropertyOptional({ example: 'Rice Blast' })
  @IsOptional()
  @IsString()
  @Length(2, 150)
  scientificName?: string;

  @ApiPropertyOptional({ example: 'Đốm hình mắt, viền nâu, tâm xám' })
  @IsOptional()
  @IsString()
  signs?: string;

  @ApiPropertyOptional({ example: 'medium' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ example: 'Tricyclazole 75WP, Isoprothiolane' })
  @IsOptional()
  @IsString()
  treatment?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateDiseaseDTO {
  @ApiPropertyOptional({ example: 'Bệnh đạo ôn' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ example: 'Rice Blast' })
  @IsOptional()
  @IsString()
  @Length(2, 150)
  scientificName?: string;

  @ApiPropertyOptional({ example: 'Đốm hình mắt, viền nâu, tâm xám' })
  @IsOptional()
  @IsString()
  signs?: string;

  @ApiPropertyOptional({ example: 'medium' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ example: 'Tricyclazole 75WP, Isoprothiolane' })
  @IsOptional()
  @IsString()
  treatment?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
