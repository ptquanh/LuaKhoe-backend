import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequestUser } from '@shared/decorators/request-user.decorator';
import { Roles } from '@shared/decorators/roles.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { UserAuthProfile } from '@shared/interfaces';

import { CreateFeedbackDto, ProcessFeedbackDto } from './feedback.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('Feedbacks')
@ApiBearerAuth()
@Controller('feedbacks')
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Submit feedback for a diagnosis' })
  async submit(
    @RequestUser() user: UserAuthProfile,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.createFeedback(user.id, dto);
  }

  @Get('my-feedbacks')
  @ApiOperation({ summary: 'Get feedback submitted by current user' })
  async getMyFeedbacks(@RequestUser() user: UserAuthProfile) {
    return this.feedbackService.findByUserId(user.id);
  }

  @Get()
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List all feedbacks (Admin only)' })
  async findAll() {
    return this.feedbackService.getAllFeedbacks();
  }

  @Patch(':id/process')
  @Roles(ROLE.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Approve or Reject feedback (Admin only)' })
  async process(
    @RequestUser() user: UserAuthProfile,
    @Param('id') id: string,
    @Body() dto: ProcessFeedbackDto,
  ) {
    return this.feedbackService.processFeedback(
      user.id,
      id,
      dto.status,
      dto.response,
    );
  }
}
