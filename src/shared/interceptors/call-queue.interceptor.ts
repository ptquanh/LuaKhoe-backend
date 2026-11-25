import { LRUCache } from 'lru-cache';
import { AuditService, ErrorLog } from 'mvc-common-toolkit';
import {
  Observable,
  TimeoutError,
  catchError,
  finalize,
  throwError,
  timeout,
} from 'rxjs';

import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
  Optional,
  SetMetadata,
  UseInterceptors,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  APP_ACTION,
  DEFAULT_MAX_CONCURRENT_CALL,
  INJECTION_TOKEN,
} from '@shared/constants';
import { HEADER_KEY, METADATA_KEY } from '@shared/enums';

export const MaxConcurrencyCall = (maxConcurrency: number) =>
  SetMetadata(METADATA_KEY.MAX_CONCURRENCY_CALL, maxConcurrency);

@Injectable()
export class CallQueueInterceptor implements NestInterceptor {
  protected logger = new Logger(CallQueueInterceptor.name);

  constructor(
    protected reflector: Reflector,

    @Inject(INJECTION_TOKEN.AUDIT_SERVICE)
    protected auditService: AuditService,

    @Optional()
    protected cacheEngine = new LRUCache({
      max: 1000000,
    }),
  ) {}

  public async intercept(
    ctx: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const httpReq: any = ctx.switchToHttp().getRequest();
    const httpRes: any = ctx.switchToHttp().getResponse();
    const logId = httpReq.headers[HEADER_KEY.LOG_ID];

    const userIP =
      httpReq.ip ||
      httpReq.headers['x-forwarded-for']?.split(',').shift() ||
      httpReq.socket?.remoteAddress ||
      'unknown_ip';

    const method = httpReq.method;
    const user = httpReq.activeUser || httpReq.user || { id: userIP };

    const reqUrl = httpReq.url;
    const userId = user.id;

    const cacheKey = `${userId}:${method}:${reqUrl}`;

    const existingValue =
      (this.cacheEngine.get(cacheKey) as number | undefined) || 0;

    const maxConcurrencyCall =
      this.reflector.get(METADATA_KEY.MAX_CONCURRENCY_CALL, ctx.getHandler()) ||
      DEFAULT_MAX_CONCURRENT_CALL;

    const newValue = existingValue + 1;

    if (newValue > maxConcurrencyCall) {
      this.logger.warn(
        `user ${user.id} exceeded concurrency limit for cache key ${cacheKey}`,
      );
      this.auditService.emitLog(
        new ErrorLog({
          logId,
          userId: user.id,
          message: `user ${user.id} exceeded concurrency limit for cache key ${cacheKey}`,
          action: APP_ACTION.API_CALL,
        }),
      );

      return throwError(
        () => new ForbiddenException('Max concurrency call reached!'),
      );
    }

    this.cacheEngine.set(cacheKey, newValue);

    let released = false;
    const release = () => {
      if (released) return;
      released = true;

      httpReq.off?.('aborted', release);
      httpRes?.off?.('close', onClose);

      const currentValue =
        (this.cacheEngine.get(cacheKey) as number | undefined) || 0;

      if (currentValue <= 1) {
        this.cacheEngine.delete(cacheKey);
      } else {
        this.cacheEngine.set(cacheKey, currentValue - 1);
      }
    };

    const onClose = () => {
      if (!httpRes?.writableEnded) {
        release();
      }
    };

    httpReq.once?.('aborted', release);
    httpRes?.once?.('close', onClose);

    return next.handle().pipe(
      timeout(60 * 1000),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          this.logger.error(
            `Timeout error for user ${user.id}. Path: ${cacheKey}`,
          );

          this.auditService.emitLog(
            new ErrorLog({
              logId,
              userId: user.id,
              message: `Timeout error for user ${user.id}`,
              action: APP_ACTION.API_CALL,
              metadata: {
                cacheKey,
              },
            }),
          );
        }
        // Perform any additional error handling if necessary
        return throwError(() => err);
      }),
      finalize(release),
    );
  }
}

export function UseCallQueue(maxConcurrency = 1) {
  return applyDecorators(
    MaxConcurrencyCall(maxConcurrency),
    UseInterceptors(CallQueueInterceptor),
  );
}
