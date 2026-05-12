import { IsNumber, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateDiagnosisDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Rice leaf image file',
  })
  image: any;

  @ApiProperty({ required: false, example: 10.762622 })
  @IsOptional()
  @IsNumber()
  gpsLat?: number;

  @ApiProperty({ required: false, example: 106.660172 })
  @IsOptional()
  @IsNumber()
  gpsLng?: number;

  @ApiProperty({ required: false, example: 'High humidity, after rain' })
  @IsOptional()
  @IsString()
  envDescription?: string;
}
