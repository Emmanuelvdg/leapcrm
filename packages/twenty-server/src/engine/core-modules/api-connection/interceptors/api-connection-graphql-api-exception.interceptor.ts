import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';

import { type Observable, catchError } from 'rxjs';

import { apiConnectionGraphqlApiExceptionHandler } from 'src/engine/core-modules/api-connection/utils/api-connection-graphql-api-exception-handler.util';

@Injectable()
export class ApiConnectionGraphqlApiExceptionInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next
      .handle()
      .pipe(catchError(apiConnectionGraphqlApiExceptionHandler));
  }
}
