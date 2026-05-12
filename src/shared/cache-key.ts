export const resetPasswordCacheKey = (email: string) =>
  `auth:reset_password:user_email:${email}`;

export const otpCacheKey = (id: string, action: string) =>
  `auth:otp:user_id:${id}:action:${action}`;
