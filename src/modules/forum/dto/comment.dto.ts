import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDTO {
  @ApiProperty({
    example:
      'Bà con nên dùng thuốc đặc trị vi khuẩn kết hợp với trừ nấm đạo ôn.',
  })
  @IsNotEmpty()
  @IsString()
  @Length(1, 1000)
  content: string;

  @ApiPropertyOptional({ example: 'a0b1c2d3-e4f5-6789-0123-456789abcdef' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateCommentDTO {
  @ApiProperty({ example: 'Nội dung bình luận đã cập nhật...' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 1000)
  content: string;
}

export class GetCommentsQueryDTO {
  @ApiPropertyOptional({
    description: 'Pagination cursor (ISO String of createdAt)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 3, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 3;
}

export class VoteCommentDTO {
  @ApiProperty({ example: 'up', enum: ['up', 'down', 'none'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['up', 'down', 'none'])
  type: 'up' | 'down' | 'none';
}
