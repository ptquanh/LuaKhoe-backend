import { IsEnum, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { POST_STATUS } from '@shared/enums';

export class ModeratePostDto {
  @ApiProperty({
    description: 'Post status to update',
    enum: POST_STATUS,
    example: POST_STATUS.APPROVED,
  })
  @IsEnum(POST_STATUS)
  status: POST_STATUS;

  @ApiProperty({
    description: 'Reason for post moderation (rejection/expiration)',
    example: 'Nội dung chứa từ ngữ không phù hợp',
    required: false,
  })
  @IsString()
  @IsOptional()
  flaggedReason?: string;
}
