import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { POST_STATUS, VOTE_TYPE } from '@shared/enums';

export class CreatePostDTO {
  @ApiProperty({
    example:
      'Lúa bị đạo ôn kết hợp vi khuẩn thì xịt thuốc gì hiệu quả thưa các chuyên gia?',
  })
  @IsNotEmpty()
  @IsString()
  @Length(10, 5000)
  content: string;

  @ApiPropertyOptional({
    example: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(4)
  images?: string[];

  @ApiPropertyOptional({ example: ['Đạo ôn', 'Kỹ thuật'] })
  @IsOptional()
  @Transform(({ value, obj }) => {
    const rawTags = value ?? obj['tags[]'] ?? obj['tags'];
    if (typeof rawTags === 'string') {
      return [rawTags];
    }
    if (Array.isArray(rawTags)) {
      return rawTags;
    }
    return undefined;
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'Hỏi đáp' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isDraft?: boolean;
}

export class UpdatePostDTO {
  @ApiPropertyOptional({ example: 'Nội dung cập nhật của bài viết...' })
  @IsOptional()
  @IsString()
  @Length(10, 5000)
  content?: string;

  @ApiPropertyOptional({
    example: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(4)
  images?: string[];

  @ApiPropertyOptional({ example: ['Đạo ôn', 'Kỹ thuật'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'Hỏi đáp' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}

export class GetPostsQueryDTO {
  @ApiPropertyOptional({
    description: 'Base64 encoded composite cursor (e.g. score_createdAt)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 10, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ default: 'new', enum: ['new', 'hot'] })
  @IsOptional()
  @IsString()
  @IsIn(['new', 'hot'])
  sort?: 'new' | 'hot' = 'new';

  @ApiPropertyOptional({ description: 'Filter posts by tags' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Filter posts by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter posts by status',
    enum: POST_STATUS,
  })
  @IsOptional()
  @IsEnum(POST_STATUS, { message: 'Status không hợp lệ' })
  status?: POST_STATUS;
}

export class VotePostDTO {
  @ApiProperty({ example: VOTE_TYPE.UP, enum: VOTE_TYPE })
  @IsNotEmpty()
  @IsEnum(VOTE_TYPE, { message: 'Vote type không hợp lệ' })
  type: VOTE_TYPE;
}

export class AiEnhancePostDTO {
  @ApiProperty({ example: 'Lúa nhà tôi bị vàng lá nhẹ ở phần ngọn...' })
  @IsNotEmpty()
  @IsString()
  content: string;
}
