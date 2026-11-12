import { type WorkflowRunStepLog } from 'twenty-shared/workflow';

import { type ApiConnectionCallToolOutput } from 'src/engine/core-modules/api-connection/tools/api-connection-call.tool';
import { type WorkflowApiConnectionCallActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/api-connection-call/types/workflow-api-connection-call-action-input.type';
import { serializeStepLogPayload } from 'src/modules/workflow/workflow-executor/workflow-actions/tool-backed/utils/serialize-step-log-payload.util';

export const buildApiConnectionCallStepLog = ({
  input,
  output,
  durationMs,
}: {
  input: WorkflowApiConnectionCallActionInput;
  output: ApiConnectionCallToolOutput;
  durationMs: number;
}): WorkflowRunStepLog => {
  const serializedArguments = serializeStepLogPayload(input.arguments);
  const serializedResult = serializeStepLogPayload(output.result);

  return {
    details: {
      type: 'API_CONNECTION_CALL',
      connectionId: input.connectionId ?? '',
      operationName: input.operationName ?? '',
      method: output.request?.method,
      url: output.request?.url,
      status: output.status,
      arguments: serializedArguments.value,
      argumentsBytes: serializedArguments.bytes,
      argumentsTruncated: serializedArguments.truncated,
      result: serializedResult.value,
      resultBytes: serializedResult.bytes,
      resultTruncated: serializedResult.truncated,
      error: output.error,
      durationMs,
    },
    entries: [],
    sizeBytes: 0,
  };
};
