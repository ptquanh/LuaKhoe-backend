import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { AuditWithTimezone } from '@shared/common/audit.entity';
import { DISEASE_STATUS } from '@shared/constants';

@Entity('diseases')
export class Disease extends AuditWithTimezone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({
    name: 'scientific_name',
    type: 'varchar',
    length: 150,
    unique: true,
    nullable: true,
  })
  scientificName: string;

  @Column({ name: 'ai_class_name', type: 'varchar', length: 50, unique: true })
  aiClassName: string;

  @Column({ type: 'text', nullable: true })
  signs: string;

  @Column({ type: 'varchar', default: DISEASE_STATUS.VISIBLE })
  status: DISEASE_STATUS;

  @Column({ type: 'varchar', length: 50, default: 'medium' })
  severity: string;

  @Column({ type: 'text', nullable: true })
  treatment: string;

  @Column({ name: 'image_url', type: 'varchar', length: 512, nullable: true })
  imageUrl: string;
}
