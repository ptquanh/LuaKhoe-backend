import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Diagnosis } from '@modules/diagnosis/entities/diagnosis.entity';
import { User } from '@modules/user/entities/user.entity';

import { FEEDBACK_STATUS } from '@shared/constants';

import { FeedbackActualDisease } from './feedback-actual-disease.entity';

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Diagnosis, (diagnosis) => diagnosis.feedbacks)
  @JoinColumn({ name: 'diagnosis_id' })
  diagnosis: Diagnosis;

  @Column({ name: 'diagnosis_id', type: 'uuid' })
  diagnosisId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'user_message', type: 'text', nullable: true })
  userMessage: string;

  @Column({ type: 'varchar', default: FEEDBACK_STATUS.PENDING })
  status: FEEDBACK_STATUS;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin: User;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId: string;

  @Column({ name: 'admin_response', type: 'text', nullable: true })
  adminResponse: string;

  @Column({
    name: 'processed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  processedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @OneToMany(() => FeedbackActualDisease, (fad) => fad.feedback, {
    cascade: true,
  })
  actualDiseases: FeedbackActualDisease[];
}
