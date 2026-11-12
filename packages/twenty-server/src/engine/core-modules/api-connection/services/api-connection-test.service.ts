import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type ApiConnectionEntity } from 'src/engine/core-modules/api-connection/entities/api-connection.entity';
import { ApiConnectionClientService } from 'src/engine/core-modules/api-connection/services/api-connection-client.service';
import { ApiConnectionService } from 'src/engine/core-modules/api-connection/services/api-connection.service';

const RESPONSE_PREVIEW_LENGTH = 2000;

export type ApiConnectionTestResult = {
  success: boolean;
  httpStatus: number | null;
  durationMs: number | null;
  responsePreview: string | null;
  errorMessage: string | null;
  connection: ApiConnectionEntity;
};

const buildPreview = (result: unknown): string | null => {
  if (!isDefined(result)) {
    return null;
  }

  return JSON.stringify(result, null, 2).slice(0, RESPONSE_PREVIEW_LENGTH);
};

@Injectable()
export class ApiConnectionTestService {
  constructor(
    private readonly apiConnectionService: ApiConnectionService,
    private readonly apiConnectionClientService: ApiConnectionClientService,
  ) {}

  // A test call may cost credits on some APIs, so it only ever runs the
  // operation the admin picked; without one the connection stays PENDING.
  async testConnection(
    connection: ApiConnectionEntity,
  ): Promise<ApiConnectionTestResult> {
    if (!isDefined(connection.testOperationName)) {
      return {
        success: false,
        httpStatus: null,
        durationMs: null,
        responsePreview: null,
        errorMessage: 'Choose a test operation to test this connection',
        connection,
      };
    }

    try {
      const { toolOutput, durationMs } =
        await this.apiConnectionClientService.callOperation({
          connection,
          operationName: connection.testOperationName,
          args: connection.testArguments ?? {},
          allowDisabledOperation: true,
        });

      const errorMessage = toolOutput.success
        ? null
        : (toolOutput.error ?? toolOutput.message);

      const updated = await this.apiConnectionService.recordTestResult(
        connection,
        { success: toolOutput.success, errorMessage },
      );

      return {
        success: toolOutput.success,
        httpStatus: toolOutput.status ?? null,
        durationMs,
        responsePreview: buildPreview(toolOutput.result),
        errorMessage,
        connection: updated,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const updated = await this.apiConnectionService.recordTestResult(
        connection,
        { success: false, errorMessage },
      );

      return {
        success: false,
        httpStatus: null,
        durationMs: null,
        responsePreview: null,
        errorMessage,
        connection: updated,
      };
    }
  }
}
