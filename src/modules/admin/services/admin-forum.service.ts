import { Injectable } from '@nestjs/common';

import { Post } from '@modules/forum/entities/post.entity';
import { PostService } from '@modules/forum/services/post.service';

import { POST_STATUS } from '@shared/enums';

@Injectable()
export class AdminForumService {
  constructor(private readonly postService: PostService) {}

  async moderatePost(
    postId: string,
    status: POST_STATUS,
    flaggedReason?: string,
  ): Promise<Post> {
    return this.postService.moderatePost(postId, status, flaggedReason);
  }
}
