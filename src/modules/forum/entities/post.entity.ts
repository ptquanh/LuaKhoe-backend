import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '@modules/user/entities/user.entity';

import { AuditWithTimezone } from '@shared/common/audit.entity';

import { Comment } from './comment.entity';
import { PostVote } from './post-vote.entity';

@Entity('posts')
export class Post extends AuditWithTimezone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'author_id', type: 'uuid' })
  @Index()
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'integer', default: 0 })
  upvotes: number;

  @Column({ type: 'integer', default: 0 })
  downvotes: number;

  @Column({ name: 'comment_count', type: 'integer', default: 0 })
  commentCount: number;

  @Column({ type: 'integer', default: 0 })
  @Index()
  score: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @OneToMany(() => PostVote, (vote) => vote.post)
  votes: PostVote[];
}
