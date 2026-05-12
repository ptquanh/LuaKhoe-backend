export const INJECTION_TOKEN = {
  AUDIT_SERVICE: Symbol.for('AUDIT_SERVICE'),
  HTTP_SERVICE: Symbol.for('HTTP_SERVICE'),
  REDIS_SERVICE: Symbol.for('REDIS_SERVICE'),
  SYNC_TASK_QUEUE: Symbol.for('SYNC_TASK_QUEUE'),
  MAIL_TRANSPORTER: Symbol.for('MAIL_TRANSPORTER'),
};

export const ERR_CODE = {
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'.toLowerCase(),
  NOT_FOUND: 'NOT_FOUND'.toLowerCase(),
  BAD_REQUEST: 'BAD_REQUEST'.toLowerCase(),
  ALREADY_EXISTS: 'ALREADY_EXISTS'.toLowerCase(),
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY'.toLowerCase(),
  FORBIDDEN: 'FORBIDDEN'.toLowerCase(),
  UNAUTHORIZED: 'UNAUTHORIZED'.toLowerCase(),
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS'.toLowerCase(),
  USER_NOT_FOUND: 'USER_NOT_FOUND'.toLowerCase(),
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS'.toLowerCase(),
  USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS'.toLowerCase(),
  INVALID_OTP: 'INVALID_OTP'.toLowerCase(),
  ACCOUNT_IS_NOT_ACTIVE: 'ACCOUNT_IS_NOT_ACTIVE'.toLowerCase(),
  PASSWORD_INCORRECT: 'PASSWORD_INCORRECT'.toLowerCase(),
  OTP_ALREADY_SENT: 'OTP_ALREADY_SENT'.toLowerCase(),
  PASSWORD_SAME_AS_OLD: 'PASSWORD_SAME_AS_OLD'.toLowerCase(),
  PASSWORD_OR_USERNAME_INCORRECT:
    'PASSWORD_OR_USERNAME_INCORRECT'.toLowerCase(),
  PASSWORD_CONFIRMATION_MISMATCH:
    'PASSWORD_CONFIRMATION_MISMATCH'.toLowerCase(),
};

export const APP_ACTION = {
  API_CALL: 'API_CALL'.toLowerCase(),
  HANDLE_EXCEPTION: 'HANDLE_EXCEPTION'.toLowerCase(),
  SEND_TO_PARTNER: 'SEND_TO_PARTNER'.toLowerCase(),
  SEND_EMAIL: 'SEND_EMAIL'.toLowerCase(),
  REGISTER: 'REGISTER'.toLowerCase(),
  LOGIN: 'LOGIN'.toLowerCase(),
  FORGOT_PASSWORD: 'FORGOT_PASSWORD'.toLowerCase(),
  RESET_PASSWORD: 'RESET_PASSWORD'.toLowerCase(),
  CHANGE_PASSWORD: 'CHANGE_PASSWORD'.toLowerCase(),
  SOCIAL_LOGIN: 'SOCIAL_LOGIN'.toLowerCase(),
  BAN_TOO_MANY_FAILED_ATTEMPTS: 'BAN_TOO_MANY_FAILED_ATTEMPTS'.toLowerCase(),
};

export enum CONFIG_KEY {
  APP = 'app',
  DATABASE = 'database',
  JWT = 'jwt',
  REDIS = 'redis',
  EMAIL = 'email',
}

export const ENV_KEY = {
  PORT: CONFIG_KEY.APP + '.port',
  NODE_ENV: CONFIG_KEY.APP + '.nodeEnv',
  APP_NAME: CONFIG_KEY.APP + '.appName',
  APP_PUBLIC_URL: CONFIG_KEY.APP + '.appPublicUrl',
  SERVICE_NAME: CONFIG_KEY.APP + '.serviceName',
  ENABLE_CORS: CONFIG_KEY.APP + '.enableCors',
  ENABLE_SWAGGER: CONFIG_KEY.APP + '.enableSwagger',

  DB_HOST: CONFIG_KEY.DATABASE + '.host',
  DB_PORT: CONFIG_KEY.DATABASE + '.port',
  DB_USERNAME: CONFIG_KEY.DATABASE + '.username',
  DB_PASSWORD: CONFIG_KEY.DATABASE + '.password',
  DB_SCHEMA: CONFIG_KEY.DATABASE + '.schema',
  DB_SYNCHRONIZE: CONFIG_KEY.DATABASE + '.synchronize',
  DB_LOGGING: CONFIG_KEY.DATABASE + '.logging',

  REDIS_HOST: CONFIG_KEY.REDIS + '.host',
  REDIS_PORT: CONFIG_KEY.REDIS + '.port',
  REDIS_PASSWORD: CONFIG_KEY.REDIS + '.password',

  JWT_SECRET: CONFIG_KEY.JWT + '.secret',
  JWT_EXPIRATION: CONFIG_KEY.JWT + '.expiration',

  AUDIT_WEBHOOK_URL: CONFIG_KEY.APP + '.auditWebhookUrl',

  SMTP_USERNAME: CONFIG_KEY.EMAIL + '.smtpUsername',
  SMTP_PASSWORD: CONFIG_KEY.EMAIL + '.smtpPassword',
  SMTP_HOST: CONFIG_KEY.EMAIL + '.smtpHost',
  SMTP_PORT: CONFIG_KEY.EMAIL + '.smtpPort',
  SMTP_SECURE: CONFIG_KEY.EMAIL + '.smtpSecure',

  ADMIN_EMAILS: CONFIG_KEY.EMAIL + '.adminEmails',

  GOOGLE_CLIENT_ID: CONFIG_KEY.APP + '.googleClientId',
  GOOGLE_CLIENT_SECRET: CONFIG_KEY.APP + '.googleClientSecret',
  GOOGLE_CALLBACK_URL: CONFIG_KEY.APP + '.googleCallbackUrl',
};

export enum METADATA_KEY {
  MAX_CONCURRENCY_CALL = 'max_concurrency_call',
  RATE_LIMITING = 'rate_limiting',
  USER_ID_EXTRACTOR = 'user_id_extractor',
  MAX_ATTEMPTS_ALLOWED = 'max_attempts_allowed',
}

export const DEFAULT_MAX_CONCURRENT_CALL = 1;
export const DEFAULT_FAILED_ATTEMPTS_BAN = 3;

export enum HEADER_KEY {
  CAPTCHA_TOKEN = 'X-Captcha-Token',
  LOG_ID = 'X-Log-ID',
  SESSION_TOKEN = 'X-Session-Token',
  ACCESS_KEY_ID = 'X-Access-Key-ID',
  ACCESS_KEY_SECRET = 'X-Access-Key-Secret',
  PARTNER_ACCESS_SECRET = 'X-Partner-Access-Secret',
}

export enum ENTITY_STATUS {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

export enum PARTNER_DIRECTION {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum PARTNER_TYPE {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

export enum PARTNER_AUTH_TYPE {
  ID_AND_SECRET = 'idAndSecret',
  MASTER_TOKEN = 'masterToken',
  API_KEY = 'apiKey',
}

export enum EMAIL_TEMPLATE {
  EMAIL_VERIFICATION = 'email-verification',
  EMAIL_RESET_PASSWORD = 'reset-password',
}

export enum VERIFY_OTP_ACTION {
  REGISTER = 'register',
}

export enum SOCIAL_PROVIDER {
  GOOGLE = 'google',
}

export const CACHE_TTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 5 * 60,
  TEN_MINUTES: 10 * 60,
  ONE_HOUR: 60 * 60,
  ONE_DAY: 24 * 60 * 60,
} as const;
