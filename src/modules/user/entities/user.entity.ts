import {
  Column,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AuditWithTimezone } from '@shared/common/audit.entity';
import { ENTITY_STATUS, ROLE } from '@shared/enums';

import { AdminProfile } from './admin-profile.entity';
import { FarmerProfile } from './farmer-profile.entity';
import { UserField } from './user-field.entity';
import { UserSocialAccount } from './user-social-account.entity';

@Entity('users')
export class User extends AuditWithTimezone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: ENTITY_STATUS.INACTIVE })
  status: ENTITY_STATUS;

  @Column({ type: 'varchar', unique: true })
  @Index()
  email: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  username: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'varchar', default: ROLE.FARMER })
  role: ROLE;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata: Record<string, any>;

  @Column({
    name: 'avatar_url',
    type: 'varchar',
    length: 512,
    default:
      'https://res.cloudinary.com/ptquanh/image/upload/v1779947161/default-avatar.png',
  })
  avatarUrl: string;

  @OneToOne(() => FarmerProfile, (profile) => profile.user)
  farmerProfile: FarmerProfile;

  @OneToOne(() => AdminProfile, (profile) => profile.user)
  adminProfile: AdminProfile;

  @OneToMany(() => UserSocialAccount, (social) => social.user)
  socialAccounts: UserSocialAccount[];

  @OneToMany(() => UserField, (field) => field.user, { cascade: true })
  fields: UserField[];
}
