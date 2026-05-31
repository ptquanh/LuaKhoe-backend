import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { FEEDBACK_STATUS } from '@shared/enums';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'diagnosis-uuid' })
  @IsUUID()
  diagnosisId: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    example: 'AI chẩn đoán thiếu bệnh ở góc phải.',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ type: [String], example: ['disease-uuid-1'] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  actualDiseaseIds: string[];
}

export class ProcessFeedbackDto {
  @ApiProperty({
    enum: FEEDBACK_STATUS,
    example: FEEDBACK_STATUS.APPROVED,
    description: 'Feedback status (approved or rejected)',
  })
  @IsEnum(FEEDBACK_STATUS)
  status: FEEDBACK_STATUS;

  @ApiProperty({
    example: 'Thank you. We have updated the diagnostic model.',
    required: false,
    description: 'Admin response message',
  })
  @IsOptional()
  @IsString()
  response?: string;
}
