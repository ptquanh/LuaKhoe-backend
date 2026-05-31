import { CONFIG_KEY } from './enums';

export const INJECTION_TOKEN = {
  AUDIT_SERVICE: Symbol.for('AUDIT_SERVICE'),
  HTTP_SERVICE: Symbol.for('HTTP_SERVICE'),
  REDIS_SERVICE: Symbol.for('REDIS_SERVICE'),
  SYNC_TASK_QUEUE: Symbol.for('SYNC_TASK_QUEUE'),
  MAIL_TRANSPORTER: Symbol.for('MAIL_TRANSPORTER'),
  CLOUDINARY_SERVICE: Symbol.for('CLOUDINARY_SERVICE'),
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
  CONTENT_POLICY_VIOLATION: 'CONTENT_POLICY_VIOLATION'.toLowerCase(),
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

export const EVENT_KEYS = {
  POST_CREATED: 'post.created',
  ADMIN_ALERT_VIOLATION: 'admin.alert.violation',
};

// Enums CONFIG_KEY and SYSTEM_CONFIG_KEY have been moved to enums.ts

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

  CLOUDINARY_CLOUD_NAME: CONFIG_KEY.CLOUDINARY + '.cloudName',
  CLOUDINARY_API_KEY: CONFIG_KEY.CLOUDINARY + '.apiKey',
  CLOUDINARY_API_SECRET: CONFIG_KEY.CLOUDINARY + '.apiSecret',

  R2_BUCKET_NAME: CONFIG_KEY.R2 + '.bucketName',
  R2_PUBLIC_DOMAIN: CONFIG_KEY.R2 + '.publicDomain',
  R2_ACCOUNT_ID: CONFIG_KEY.R2 + '.accountId',
  R2_ACCESS_KEY_ID: CONFIG_KEY.R2 + '.accessKeyId',
  R2_SECRET_ACCESS_KEY: CONFIG_KEY.R2 + '.secretAccessKey',

  GEMINI_API_KEY: CONFIG_KEY.GEMINI + '.apiKey',
  GEMINI_EMBEDDING_MODEL_NAME: CONFIG_KEY.GEMINI + '.embeddingModelName',

  GROQ_API_KEY: CONFIG_KEY.GROQ + '.apiKey',
  GROQ_MODEL_NAME: CONFIG_KEY.GROQ + '.modelName',

  COHERE_API_KEY: CONFIG_KEY.COHERE + '.apiKey',
};

// Enum METADATA_KEY has been moved to enums.ts

export const DEFAULT_MAX_CONCURRENT_CALL = 1;
export const DEFAULT_FAILED_ATTEMPTS_BAN = 3;

// Enum HEADER_KEY has been moved to enums.ts

// Enums ENTITY_STATUS, PARTNER_DIRECTION, PARTNER_TYPE, PARTNER_AUTH_TYPE, EMAIL_TEMPLATE, VERIFY_OTP_ACTION, SOCIAL_PROVIDER have been moved to enums.ts

export const CACHE_TTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 5 * 60,
  TEN_MINUTES: 10 * 60,
  ONE_HOUR: 60 * 60,
  ONE_DAY: 24 * 60 * 60,
  THIRTY_DAYS: 30 * 24 * 60 * 60,
} as const;

export const getStorageFolder = () => ({
  DIAGNOSES: `${process.env.APP_NAME}/images/upload/diagnoses`,
  DIAGNOSES_RESULTS: `${process.env.APP_NAME}/images/upload/diagnoses-results`,
  AVATARS: `${process.env.APP_NAME}/images/upload/avatars`,
  AI_MODELS: `${process.env.APP_NAME}/files/upload/ai_models`,
  FORUM_POSTS: `${process.env.APP_NAME}/images/upload/forum/posts`,
  FORUM_COMMENTS: `${process.env.APP_NAME}/images/upload/forum/comments`,
});

// Enums DISEASE_STATUS and FEEDBACK_STATUS have been moved to enums.ts

export const VOTE_CONFIG = {
  POST: {
    targetName: 'Post',
    voteRelationField: 'postId',
    updateScore: true,
  },
  COMMENT: {
    targetName: 'Comment',
    voteRelationField: 'commentId',
    updateScore: false,
  },
} as const;

export const RESERVED_USERNAMES = [
  'settings',
  'edit',
  'admin',
  'api',
  'auth',
  'login',
  'register',
  'dashboard',
  'search',
  'profile',
  'forum',
];
