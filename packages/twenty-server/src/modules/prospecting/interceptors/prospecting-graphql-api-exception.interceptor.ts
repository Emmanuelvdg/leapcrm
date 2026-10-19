import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';

import { type Observable, catchError } from 'rxjs';

import { prospectingGraphqlApiExceptionHandler } from 'src/modules/prospecting/utils/prospecting-graphql-api-exception-handler.util';

@Injectable()
export class ProspectingGraphqlApiExceptionInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next
      .handle()
      .pipe(catchError(prospectingGraphqlApiExceptionHandler));
  }
}
