export const resetPasswordCacheKey = (email: string) =>
  `auth:reset_password:user_email:${email}`;

export const otpCacheKey = (id: string, action: string) =>
  `auth:otp:user_id:${id}:action:${action}`;

export const geocodeCacheKey = (lat: number, lng: number) =>
  `geocode:${lat.toFixed(3)},${lng.toFixed(3)}`;

export const weatherCacheKey = (lat: number, lng: number) =>
  `weather:${lat.toFixed(2)},${lng.toFixed(2)}`;

export const systemConfigCacheKey = (key: string) => `system_config:${key}`;

export const failedAttemptCacheKey = (
  userId: string,
  routeIdentifier: string,
) => `user:${userId}:route:${routeIdentifier}:failed-attempts`;

export const rateLimitCacheKey = (
  method: string,
  endpoint: string,
  requestIp: string,
) => `rate_limit:${method}:${endpoint}:${requestIp}`;

export const semanticCacheKey = (
  diseases: { name: string; confidence: number; affectedAreaRatio: number }[],
) => {
  const sortedDiseases = [...diseases]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => {
      let confStr = 'Low';
      if (d.confidence > 0.7) confStr = 'High';
      else if (d.confidence >= 0.4) confStr = 'Med';
      const cleanName = d.name.replace(/\s+/g, '-');
      return `${cleanName}(${confStr})`;
    })
    .join('-');

  const maxArea = Math.max(...diseases.map((d) => d.affectedAreaRatio || 0));
  const areaStr = maxArea > 0.3 ? 'Nặng' : 'Nhẹ';

  return `semantic_cache:diagnosis:diseases:${sortedDiseases}:area:${areaStr}`;
};

export const semanticCacheKeysListKey = 'semantic_cache_keys';
