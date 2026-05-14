import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AiModel } from '@modules/ai-model/ai-model.entity';
import { Feedback } from '@modules/feedback/entities/feedback.entity';
import { User } from '@modules/user/entities/user.entity';

import { DiagnosisResult } from './diagnosis-result.entity';

@Entity('diagnoses')
export class Diagnosis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'original_image_url', type: 'varchar', length: 512 })
  originalImageUrl: string;

  @Column({
    name: 'result_image_url',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  resultImageUrl: string;

  @Column({
    name: 'gps_lat',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  gpsLat: number;

  @Column({
    name: 'gps_lng',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  gpsLng: number;

  @Column({ name: 'weather_data', type: 'jsonb', nullable: true })
  weatherData: Record<string, any>;

  @Column({ name: 'env_description', type: 'text', nullable: true })
  envDescription: string;

  @ManyToOne(() => AiModel)
  @JoinColumn({ name: 'model_version_id' })
  modelVersion: AiModel;

  @Column({ name: 'model_version_id', type: 'uuid' })
  modelVersionId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @OneToMany(() => DiagnosisResult, (result) => result.diagnosis, {
    cascade: true,
  })
  results: DiagnosisResult[];

  @OneToMany(() => Feedback, (feedback) => feedback.diagnosis)
  feedbacks: Feedback[];
}
