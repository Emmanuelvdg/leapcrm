import { Injectable } from '@nestjs/common';

import { isAxiosError } from 'axios';
import { isDefined } from 'twenty-shared/utils';

import { ApiConnectionExceptionCode } from 'src/engine/core-modules/api-connection/api-connection-exception-code.enum';
import { ApiConnectionException } from 'src/engine/core-modules/api-connection/api-connection.exception';
import { type ApiConnectionEntity } from 'src/engine/core-modules/api-connection/entities/api-connection.entity';
import { ApiConnectionService } from 'src/engine/core-modules/api-connection/services/api-connection.service';
import { buildApiOperationRequest } from 'src/engine/core-modules/api-connection/utils/build-api-operation-request.util';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;
const ERROR_BODY_EXCERPT_LENGTH = 500;
const HTTP_UNAUTHORIZED = 401;

export type ApiOperationCallResult = {
  toolOutput: ToolOutput;
  request: { method: string; url: string } | null;
  durationMs: number;
};

const parseResponseBody = (text: string): object => {
  if (text.trim() === '') {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(text);

    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }

    return { value: parsed };
  } catch {
    return { text };
  }
};

@Injectable()
export class ApiConnectionClientService {
  constructor(
    private readonly apiConnectionService: ApiConnectionService,
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  async callOperation({
    connection,
    operationName,
    args,
    allowDisabledOperation = false,
  }: {
    connection: ApiConnectionEntity;
    operationName: string;
    args: Record<string, unknown>;
    allowDisabledOperation?: boolean;
  }): Promise<ApiOperationCallResult> {
    const operation = connection.operations.find(
      (candidate) => candidate.name === operationName,
    );

    if (
      !isDefined(operation) ||
      (!operation.isEnabled && !allowDisabledOperation)
    ) {
      throw new ApiConnectionException(
        `Operation "${operationName}" is not enabled on API connection ${connection.id}`,
        ApiConnectionExceptionCode.OPERATION_NOT_FOUND,
      );
    }

    const request = buildApiOperationRequest({
      config: {
        baseUrl: connection.baseUrl,
        authType: connection.authType,
        authHeaderName: connection.authHeaderName,
        secret: this.apiConnectionService.getDecryptedSecret(connection),
        defaultHeaders: connection.defaultHeaders,
      },
      operation,
      args,
    });

    const requestSummary = { method: request.method, url: request.url };
    const label = `${request.method} ${new URL(request.url).pathname}`;

    const httpClient = this.secureHttpClientService.getHttpClient(
      {
        timeout: REQUEST_TIMEOUT_MS,
        maxRedirects: 0,
        maxContentLength: MAX_RESPONSE_BYTES,
        maxBodyLength: MAX_REQUEST_BODY_BYTES,
        responseType: 'text',
        transformResponse: [(data: unknown) => data],
        validateStatus: () => true,
      },
      { workspaceId: connection.workspaceId, source: 'api-connection' },
    );

    const startedAt = Date.now();

    try {
      const response = await httpClient.request<string>({
        method: request.method,
        url: request.url,
        headers: request.headers,
        ...(isDefined(request.body) && { data: JSON.stringify(request.body) }),
      });

      const durationMs = Date.now() - startedAt;
      const bodyText = typeof response.data === 'string' ? response.data : '';
      const isSuccess = response.status >= 200 && response.status < 300;

      if (response.status === HTTP_UNAUTHORIZED) {
        await this.apiConnectionService.markError(
          connection,
          'The API rejected the key (401). Replace the key to reconnect.',
        );
      }

      if (isSuccess) {
        return {
          toolOutput: {
            success: true,
            message: `${label} returned ${response.status}`,
            result: parseResponseBody(bodyText),
            status: response.status,
            statusText: response.statusText,
          },
          request: requestSummary,
          durationMs,
        };
      }

      const error = `${label} failed with ${response.status}: ${bodyText.slice(0, ERROR_BODY_EXCERPT_LENGTH)}`;

      return {
        toolOutput: {
          success: false,
          message: error,
          error,
          result: parseResponseBody(bodyText),
          status: response.status,
          statusText: response.statusText,
        },
        request: requestSummary,
        durationMs,
      };
    } catch (error) {
      // Never surface the axios error itself: its config carries the auth header.
      const reason = isAxiosError(error)
        ? (error.code ?? 'request failed')
        : error instanceof Error
          ? error.message
          : 'request failed';
      const message = `${label} failed: ${reason}`;

      return {
        toolOutput: { success: false, message, error: message },
        request: requestSummary,
        durationMs: Date.now() - startedAt,
      };
    }
  }
}
