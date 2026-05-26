import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AuditWithTimezone } from '@shared/common/audit.entity';
import { User } from './user.entity';

@Entity('user_fields')
export class UserField extends AuditWithTimezone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'field_name', type: 'varchar', length: 100 })
  fieldName: string;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({
    name: 'gps_lat',
    type: 'decimal',
    precision: 10,
    scale: 8,
  })
  gpsLat: number;

  @Column({
    name: 'gps_lng',
    type: 'decimal',
    precision: 11,
    scale: 8,
  })
  gpsLng: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;
}
