import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';

import { type Observable, catchError } from 'rxjs';

import { icpAnalysisGraphqlApiExceptionHandler } from 'src/modules/icp-analysis/utils/icp-analysis-graphql-api-exception-handler.util';

@Injectable()
export class IcpAnalysisGraphqlApiExceptionInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next
      .handle()
      .pipe(catchError(icpAnalysisGraphqlApiExceptionHandler));
  }
}
