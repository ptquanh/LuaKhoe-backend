import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginatedByKeywordDTO } from '@shared/common/pagination.dto';
import { ENTITY_STATUS } from '@shared/constants';
import {
  OnlyTextAndNumbers,
  TrimAndLowercase,
} from '@shared/decorators/sanitize-input.decorator';
import { ROLE } from '@shared/enums';

export class VerifyUniquenessUserDTO {
  @IsOptional()
  @IsEmail()
  @TrimAndLowercase()
  email: string;

  @IsOptional()
  @OnlyTextAndNumbers({
    includeWhitespaces: false,
    onlyASCII: true,
    throwOnError: true,
    allowedSymbols: false,
  })
  @TrimAndLowercase()
  username: string;
}

export class UpdateUserProfileDTO {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 10.456789 })
  @IsOptional()
  @IsNumber()
  defaultGpsLat?: number;

  @ApiPropertyOptional({ example: 105.123456 })
  @IsOptional()
  @IsNumber()
  defaultGpsLng?: number;

  @ApiPropertyOptional({ example: 'An Giang' })
  @IsOptional()
  @IsString()
  defaultProvince?: string;
}

export class UpdateUserStatusDTO {
  @ApiProperty({ enum: ENTITY_STATUS, example: ENTITY_STATUS.SUSPENDED })
  @IsEnum(ENTITY_STATUS)
  status: ENTITY_STATUS;

  @ApiPropertyOptional({ example: 'Vi phạm điều khoản sử dụng' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class GetUsersAdminDTO extends PaginatedByKeywordDTO {
  @ApiPropertyOptional({ enum: ROLE })
  @IsOptional()
  @IsEnum(ROLE)
  role?: ROLE;

  @ApiPropertyOptional({ enum: ENTITY_STATUS })
  @IsOptional()
  @IsEnum(ENTITY_STATUS)
  status?: ENTITY_STATUS;
}
