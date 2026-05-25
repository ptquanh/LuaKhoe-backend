import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '@modules/user/entities/user.entity';

import { AuditWithTimezone } from '@shared/common/audit.entity';

@Entity('ai_models')
export class AiModel extends AuditWithTimezone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'version_name', type: 'varchar', length: 50 })
  versionName: string;

  @Column({ name: 'file_path', type: 'varchar', length: 512 })
  filePath: string;

  @Column({ name: 'release_notes', type: 'text', nullable: true })
  releaseNotes: string;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedById: string;
}
