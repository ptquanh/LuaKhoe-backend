import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SystemConfigModule } from '@modules/system-config/system-config.module';
import { UserModule } from '@modules/user/user.module';

import { ForumController } from './controllers/forum.controller';
import { PostExpirationCron } from './cron/post-expiration.cron';
import { CommentVote } from './entities/comment-vote.entity';
import { Comment } from './entities/comment.entity';
import { PostVote } from './entities/post-vote.entity';
import { Post } from './entities/post.entity';
import { CommentService } from './services/comment.service';
import { ModerationService } from './services/moderation.service';
import { PostService } from './services/post.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Comment, PostVote, CommentVote]),
    UserModule,
    SystemConfigModule,
  ],
  controllers: [ForumController],
  providers: [
    PostService,
    CommentService,
    ModerationService,
    PostExpirationCron,
  ],
  exports: [PostService, CommentService, ModerationService],
})
export class ForumModule {}
