import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { ApiConnectionExceptionCode } from 'src/engine/core-modules/api-connection/api-connection-exception-code.enum';
import { ApiConnectionException } from 'src/engine/core-modules/api-connection/api-connection.exception';
import {
  type OpenApiImportResult,
  parseOpenApiDocumentText,
  parseOpenApiOperations,
} from 'src/engine/core-modules/api-connection/utils/parse-open-api-operations.util';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';

const SPEC_FETCH_TIMEOUT_MS = 15_000;
const MAX_SPEC_BYTES = 10 * 1024 * 1024;

@Injectable()
export class ApiConnectionOpenApiImportService {
  constructor(
    private readonly secureHttpClientService: SecureHttpClientService,
  ) {}

  async preview({
    workspaceId,
    specUrl,
    specJson,
  }: {
    workspaceId: string;
    specUrl?: string | null;
    specJson?: string | null;
  }): Promise<OpenApiImportResult> {
    const text = isDefined(specJson)
      ? specJson
      : await this.fetchSpec(workspaceId, specUrl);

    return parseOpenApiOperations(parseOpenApiDocumentText(text));
  }

  private async fetchSpec(
    workspaceId: string,
    specUrl: string | null | undefined,
  ): Promise<string> {
    if (!isDefined(specUrl) || specUrl.trim() === '') {
      throw new ApiConnectionException(
        'Provide an OpenAPI document URL or paste the document',
        ApiConnectionExceptionCode.OPEN_API_IMPORT_FAILED,
      );
    }

    const httpClient = this.secureHttpClientService.getHttpClient(
      {
        timeout: SPEC_FETCH_TIMEOUT_MS,
        maxContentLength: MAX_SPEC_BYTES,
        responseType: 'text',
        transformResponse: [(data: unknown) => data],
        validateStatus: () => true,
      },
      { workspaceId, source: 'api-connection' },
    );

    try {
      const response = await httpClient.get<string>(specUrl.trim(), {
        headers: { Accept: 'application/json' },
      });

      if (response.status < 200 || response.status >= 300) {
        throw new ApiConnectionException(
          `Fetching the OpenAPI document returned ${response.status}`,
          ApiConnectionExceptionCode.OPEN_API_IMPORT_FAILED,
        );
      }

      return typeof response.data === 'string' ? response.data : '';
    } catch (error) {
      if (error instanceof ApiConnectionException) {
        throw error;
      }

      throw new ApiConnectionException(
        `Could not fetch the OpenAPI document: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ApiConnectionExceptionCode.OPEN_API_IMPORT_FAILED,
      );
    }
  }
}
