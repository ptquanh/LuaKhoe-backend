import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '@modules/user/user.module';

import { ForumController } from './controllers/forum.controller';
import { CommentVote } from './entities/comment-vote.entity';
import { Comment } from './entities/comment.entity';
import { PostVote } from './entities/post-vote.entity';
import { Post } from './entities/post.entity';
import { CommentService } from './services/comment.service';
import { PostService } from './services/post.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Comment, PostVote, CommentVote]),
    UserModule,
  ],
  controllers: [ForumController],
  providers: [PostService, CommentService],
  exports: [PostService, CommentService],
})
export class ForumModule {}
