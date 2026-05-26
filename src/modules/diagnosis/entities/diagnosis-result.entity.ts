import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Disease } from '@modules/disease/disease.entity';

import { AuditWithTimezone } from '@shared/common/audit.entity';
import { AdvisoryData } from '@shared/interfaces';

import { Diagnosis } from './diagnosis.entity';

@Entity('diagnosis_results')
export class DiagnosisResult extends AuditWithTimezone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Diagnosis, (diagnosis) => diagnosis.results, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'diagnosis_id' })
  diagnosis: Diagnosis;

  @Index()
  @Column({ name: 'diagnosis_id', type: 'uuid' })
  diagnosisId: string;

  @ManyToOne(() => Disease, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'disease_id' })
  disease: Disease;

  @Index()
  @Column({ name: 'disease_id', type: 'uuid' })
  diseaseId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  confidence: number;

  @Column({ name: 'mask_polygon', type: 'jsonb', nullable: true })
  maskPolygon: Record<string, any>;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string;

  @Column({ type: 'jsonb', nullable: true })
  advisory: AdvisoryData;

  @Column({ name: 'affected_area_ratio', type: 'decimal', precision: 5, scale: 4, nullable: true })
  affectedAreaRatio: number;
}
