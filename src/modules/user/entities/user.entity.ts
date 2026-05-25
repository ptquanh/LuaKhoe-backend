import {
  Column,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AuditWithTimezone } from '@shared/common/audit.entity';
import { ENTITY_STATUS } from '@shared/constants';
import { ROLE } from '@shared/enums';

import { UserProfile } from './user-profile.entity';
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

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile: UserProfile;

  @OneToMany(() => UserSocialAccount, (social) => social.user)
  socialAccounts: UserSocialAccount[];
}
