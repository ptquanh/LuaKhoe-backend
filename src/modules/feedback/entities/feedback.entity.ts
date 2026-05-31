import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Diagnosis } from '@modules/diagnosis/entities/diagnosis.entity';
import { User } from '@modules/user/entities/user.entity';

import { AuditWithTimezone } from '@shared/common/audit.entity';
import { FEEDBACK_STATUS } from '@shared/enums';

import { FeedbackActualDisease } from './feedback-actual-disease.entity';

@Entity('feedbacks')
export class Feedback extends AuditWithTimezone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Diagnosis, (diagnosis) => diagnosis.feedbacks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'diagnosis_id' })
  diagnosis: Diagnosis;

  @Index()
  @Column({ name: 'diagnosis_id', type: 'uuid' })
  diagnosisId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'user_message', type: 'text', nullable: true })
  userMessage: string;

  @Index()
  @Column({ type: 'varchar', default: FEEDBACK_STATUS.PENDING })
  status: FEEDBACK_STATUS;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
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

  @OneToMany(() => FeedbackActualDisease, (fad) => fad.feedback, {
    cascade: true,
  })
  actualDiseases: FeedbackActualDisease[];
}
