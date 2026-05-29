import { HttpResponse } from 'mvc-common-toolkit';

import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { FindOnePostParamDTO } from '@modules/forum/dto/post.dto';

import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard as JwtAuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { generateSuccessResult } from '@shared/helpers/operation-result.helper';

import { ModeratePostDto } from '../dtos/admin-forum.dto';
import { AdminForumService } from '../services/admin-forum.service';

@ApiTags('Admin Forum')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE.ADMIN)
@Controller('admin/forum')
export class AdminForumController {
  constructor(private readonly adminForumService: AdminForumService) {}

  @Put('posts/:id/moderate')
  @ApiOperation({
    summary: 'Moderate (approve/reject/expire) a post (Admin only)',
  })
  async moderatePost(
    @Param() params: FindOnePostParamDTO,
    @Body() dto: ModeratePostDto,
  ): Promise<HttpResponse> {
    const post = await this.adminForumService.moderatePost(
      params.id,
      dto.status,
      dto.flaggedReason,
    );
    return generateSuccessResult(post, 'Post status updated successfully');
  }
}
