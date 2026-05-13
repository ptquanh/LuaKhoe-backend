import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '@modules/user/user.module';

import { FeedbackActualDisease } from './entities/feedback-actual-disease.entity';
import { Feedback } from './entities/feedback.entity';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback, FeedbackActualDisease]),
    UserModule,
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
