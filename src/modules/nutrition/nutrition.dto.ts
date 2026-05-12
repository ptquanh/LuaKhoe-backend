import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class SeedNutritionDocDto {
  @ApiProperty({
    description: 'The content of the nutrition knowledge document',
    example: 'Lúa bị đạo ôn cần bón lân và kali để tăng sức đề kháng.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'The source of the document',
    example: 'Cẩm nang phòng trừ bệnh hại lúa 2026',
    required: false,
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiProperty({
    description: 'Optional metadata of the document chunk',
    example: { chapter: 3, section: 'Lúa mùa' },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class GetAdvisoryDto {
  @ApiProperty({
    description: 'The name of the rice disease',
    example: 'Bệnh đạo ôn lúa',
  })
  @IsString()
  @IsNotEmpty()
  diseaseName: string;

  @ApiProperty({
    description: 'Optional additional context or symptoms',
    example: 'Lúa đang trong giai đoạn làm đòng, lá có vết hình thoi.',
    required: false,
  })
  @IsString()
  @IsOptional()
  context?: string;
}
