import {
  APP_ENV,
  AuditService,
  AxiosHttpService,
  RedisService,
  StdOutAuditGateway,
  WebhookAuditGateway,
  stringUtils,
  workflows,
} from 'mvc-common-toolkit';
import { appConfig } from 'src/configs/app.config';

import { Global, Logger, Module, Provider } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import jwtConfig from '@configs/jwt.config';
import redisConfig from '@configs/redis.config';

import { INJECTION_TOKEN } from '@shared/constants';

const httpServiceProvider: Provider = {
  provide: INJECTION_TOKEN.HTTP_SERVICE,
  useFactory: () => {
    return new AxiosHttpService();
  },
};

const redisServiceProvider: Provider = {
  provide: INJECTION_TOKEN.REDIS_SERVICE,
  useFactory: (redis: ConfigType<typeof redisConfig>) => {
    return new RedisService({
      host: redis.host,
      port: redis.port,
      password: redis.password,
      keyPrefix: redis.prefix,
    });
  },
  inject: [redisConfig.KEY],
};

const jwtModuleProvider = JwtModule.registerAsync({
  inject: [jwtConfig.KEY],
  useFactory: (jwt: ConfigType<typeof jwtConfig>) => {
    const logger = new Logger('JwtModule');
    let secret = jwt.secret;
    if (!secret) {
      logger.warn(
        'JWT_SECRET config is not set. A random secret will be used, and all JWTs will be invalid after a restart.',
      );

      secret = stringUtils.generatePassword();
    }
    return {
      secret,
      signOptions: {
        expiresIn: jwt.expiration,
      },
    };
  },
});

const syncTaskQueueProvider: Provider = {
  provide: INJECTION_TOKEN.SYNC_TASK_QUEUE,
  useFactory: () => {
    return new workflows.SyncTaskQueue();
  },
};

const auditServiceProvider: Provider = {
  provide: INJECTION_TOKEN.AUDIT_SERVICE,
  useFactory: (app: ConfigType<typeof appConfig>) => {
    const isProd = app.nodeEnv === APP_ENV.PRODUCTION;

    const webhookUrl = app.auditWebhookUrl;
    const httpService = new AxiosHttpService();
    const shouldUseWebhook = (webhookUrl && isProd) || !!webhookUrl;

    const gateway = shouldUseWebhook
      ? new WebhookAuditGateway(webhookUrl, httpService, {
          projectName: app.serviceName,
        })
      : new StdOutAuditGateway();

    const auditService = new AuditService(gateway);

    return auditService;
  },
  inject: [appConfig.KEY],
};

@Global()
@Module({
  providers: [
    httpServiceProvider,
    redisServiceProvider,
    syncTaskQueueProvider,
    auditServiceProvider,
  ],
  exports: [
    INJECTION_TOKEN.HTTP_SERVICE,
    INJECTION_TOKEN.REDIS_SERVICE,
    INJECTION_TOKEN.SYNC_TASK_QUEUE,
    jwtModuleProvider,
    auditServiceProvider,
  ],
  imports: [jwtModuleProvider],
})
export class GlobalModule {}
