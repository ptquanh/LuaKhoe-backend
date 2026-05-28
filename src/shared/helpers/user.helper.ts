import { User } from '@modules/user/entities/user.entity';

import { UserAuthProfile } from '@shared/interfaces';

export const extractUserPublicInfo = (
  user: User,
): UserAuthProfile & { hasPassword: boolean } => {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    hasPassword: !!user.password,
  };
};
