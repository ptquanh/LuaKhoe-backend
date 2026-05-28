import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @MaxLength(20, { each: true })
  tags?: string[];
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
  @MaxLength(20, { each: true })
  tags?: string[];
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
}

export class VotePostDTO {
  @ApiProperty({ example: 'up', enum: ['up', 'down', 'none'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['up', 'down', 'none'])
  type: 'up' | 'down' | 'none';
}
