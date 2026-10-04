import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';

import { type Observable, catchError } from 'rxjs';

import { mcpConnectionGraphqlApiExceptionHandler } from 'src/engine/core-modules/mcp-connection/utils/mcp-connection-graphql-api-exception-handler.util';

@Injectable()
export class McpConnectionGraphqlApiExceptionInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next
      .handle()
      .pipe(catchError(mcpConnectionGraphqlApiExceptionHandler));
  }
}
