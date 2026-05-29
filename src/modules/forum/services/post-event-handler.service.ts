import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';

import { EVENT_KEYS } from '@shared/constants';
import { POST_STATUS } from '@shared/enums';

import { Post } from '../entities/post.entity';
import { ModerationService } from './moderation.service';

@Injectable()
export class PostEventHandlerService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly moderationService: ModerationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(EVENT_KEYS.POST_CREATED)
  async handlePostCreated(payload: { postId: string }) {
    const post = await this.postRepository.findOne({
      where: { id: payload.postId },
    });
    if (!post || post.status === POST_STATUS.DRAFT || post.isAdminPost) return;

    const moderationResult = await this.moderationService.moderatePostContent(
      post.content,
      post.images,
    );

    if (!moderationResult.isSafe) {
      const flaggedReason = moderationResult.reason || 'Bị từ chối tự động';

      // Emit the admin violation alert event
      this.eventEmitter.emit(EVENT_KEYS.ADMIN_ALERT_VIOLATION, {
        targetId: post.id,
        targetType: 'POST',
        flaggedReason,
      });
    }
  }

  @OnEvent(EVENT_KEYS.ADMIN_ALERT_VIOLATION)
  async handleAutoReject(payload: {
    targetId: string;
    targetType: 'POST' | 'COMMENT';
    flaggedReason: string;
  }) {
    if (payload.targetType === 'POST') {
      await this.postRepository.update(payload.targetId, {
        status: POST_STATUS.REJECTED,
        flaggedReason: payload.flaggedReason,
        rejectedBy: 'AI',
      });
    }
  }
}
