import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AiModel } from '@modules/ai-model/ai-model.entity';
import { Feedback } from '@modules/feedback/entities/feedback.entity';
import { UserField } from '@modules/user/entities/user-field.entity';
import { User } from '@modules/user/entities/user.entity';

import { AuditWithTimezone } from '@shared/common/audit.entity';
import { WeatherInfo } from '@shared/interfaces';

import { DiagnosisResult } from './diagnosis-result.entity';

@Entity('diagnoses')
export class Diagnosis extends AuditWithTimezone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
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
    name: 'supplement_image_url',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  supplementImageUrl: string;

  @Column({ name: 'gps_lat', type: 'float', nullable: true })
  gpsLat: number;

  @Column({ name: 'gps_lng', type: 'float', nullable: true })
  gpsLng: number;

  @Column({ type: 'text', nullable: true })
  province: string;

  @Column({ name: 'weather_data', type: 'jsonb', nullable: true })
  weatherData: WeatherInfo;

  @Column({ name: 'env_description', type: 'text', nullable: true })
  envDescription: string;

  @Column({ name: 'field_description', type: 'text', nullable: true })
  fieldDescription: string;

  @Column({ name: 'field_params', type: 'jsonb', nullable: true })
  fieldParams: any;

  @Column({ name: 'field_id', type: 'uuid', nullable: true })
  fieldId: string;

  @ManyToOne(() => UserField, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'field_id' })
  field: UserField;

  @ManyToOne(() => AiModel, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'model_version_id' })
  aiModel: AiModel;

  @Index()
  @Column({ name: 'model_version_id', type: 'uuid', nullable: true })
  modelVersionId: string;

  @OneToMany(() => DiagnosisResult, (result) => result.diagnosis, {
    cascade: true,
  })
  results: DiagnosisResult[];

  @OneToMany(() => Feedback, (feedback) => feedback.diagnosis)
  feedbacks: Feedback[];
}
