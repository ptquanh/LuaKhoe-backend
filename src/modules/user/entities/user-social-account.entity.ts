import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { AuditWithTimezone } from '@shared/common/audit.entity';

@Entity('user_social_accounts')
export class UserSocialAccount extends AuditWithTimezone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  @Index()
  userId: string;

  @Column()
  @Index()
  provider: string;

  @Column({ name: 'provider_user_id', unique: true })
  @Index()
  providerUserId: string;
}
