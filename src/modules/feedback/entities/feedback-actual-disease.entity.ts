import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { Disease } from '@modules/disease/disease.entity';

import { AuditWithTimezone } from '@shared/common/audit.entity';

import { Feedback } from './feedback.entity';

@Entity('feedback_actual_diseases')
export class FeedbackActualDisease extends AuditWithTimezone {
  @PrimaryColumn({ name: 'feedback_id', type: 'uuid' })
  feedbackId: string;

  @PrimaryColumn({ name: 'disease_id', type: 'uuid' })
  diseaseId: string;

  @ManyToOne(() => Feedback, (feedback) => feedback.actualDiseases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'feedback_id' })
  feedback: Feedback;

  @ManyToOne(() => Disease, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'disease_id' })
  disease: Disease;
}
