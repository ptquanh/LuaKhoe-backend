import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { FEEDBACK_STATUS } from '@shared/enums';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'diagnosis-uuid' })
  @IsUUID()
  diagnosisId: string;

  @ApiProperty({
    example: 'The AI missed the blast disease on the left corner.',
  })
  @IsOptional()
  @IsString()
  userMessage?: string;

  @ApiProperty({ type: [String], example: ['disease-uuid-1'] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  actualDiseaseIds: string[];
}

export class ProcessFeedbackDto {
  @ApiProperty({
    enum: FEEDBACK_STATUS,
    example: FEEDBACK_STATUS.ACCEPTED,
    description: 'Feedback status (accepted or rejected)',
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
