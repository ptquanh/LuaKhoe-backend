import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Disease } from '@modules/disease/disease.entity';

import { Diagnosis } from './diagnosis.entity';

@Entity('diagnosis_results')
export class DiagnosisResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Diagnosis, (diagnosis) => diagnosis.results, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'diagnosis_id' })
  diagnosis: Diagnosis;

  @Column({ name: 'diagnosis_id', type: 'uuid' })
  diagnosisId: string;

  @ManyToOne(() => Disease)
  @JoinColumn({ name: 'disease_id' })
  disease: Disease;

  @Column({ name: 'disease_id', type: 'uuid' })
  diseaseId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  confidence: number;

  @Column({ name: 'mask_polygon', type: 'jsonb', nullable: true })
  maskPolygon: Record<string, any>;
}
