import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '@modules/user/entities/user.entity';

import { Comment } from './comment.entity';

@Entity('comment_votes')
@Index(['commentId', 'userId'], { unique: true })
export class CommentVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'comment_id', type: 'uuid' })
  commentId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  type: 'up' | 'down';

  @ManyToOne(() => Comment, (comment) => comment.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
