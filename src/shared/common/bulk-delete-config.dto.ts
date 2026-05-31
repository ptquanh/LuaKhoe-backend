import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class BulkDeleteConfigDto {
  @ApiProperty({
    type: [String],
    description: 'Danh sách key config cần xóa',
    example: ['MAX_IMAGE_SIZE_MB', 'CONFIDENCE_THRESHOLD'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  keys: string[];
}
