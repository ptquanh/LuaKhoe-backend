import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AuditWithTimezone } from '@shared/common/audit.entity';

import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile extends AuditWithTimezone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'first_name', type: 'varchar', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', nullable: true })
  lastName: string;

  @Column({
    name: 'default_gps_lat',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  defaultGpsLat: number;

  @Column({
    name: 'default_gps_lng',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  defaultGpsLng: number;

  @Column({ name: 'default_province', type: 'varchar', nullable: true })
  defaultProvince: string;
}
