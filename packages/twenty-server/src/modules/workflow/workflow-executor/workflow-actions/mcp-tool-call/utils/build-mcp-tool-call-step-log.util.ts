import { type WorkflowRunStepLog } from 'twenty-shared/workflow';

import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type WorkflowMcpToolCallActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/mcp-tool-call/types/workflow-mcp-tool-call-action-input.type';
import { truncateStringToUtf8ByteBudget } from 'src/utils/truncate-string-to-utf8-byte-budget.util';

const MAX_PAYLOAD_BYTES = 32_000;

type SerializedPayload = {
  value: string | undefined;
  bytes: number | undefined;
  truncated: boolean;
};

const serializePayload = (payload: unknown): SerializedPayload => {
  if (payload === undefined || payload === null || payload === '') {
    return { value: undefined, bytes: undefined, truncated: false };
  }

  const serialized =
    typeof payload === 'string' ? payload : JSON.stringify(payload);

  const { value, originalBytes, truncated } = truncateStringToUtf8ByteBudget(
    serialized,
    MAX_PAYLOAD_BYTES,
  );

  return { value, bytes: originalBytes, truncated };
};

export const buildMcpToolCallStepLog = ({
  input,
  output,
  durationMs,
}: {
  input: WorkflowMcpToolCallActionInput;
  output: ToolOutput;
  durationMs: number;
}): WorkflowRunStepLog => {
  const serializedArguments = serializePayload(input.arguments);
  const serializedResult = serializePayload(
    output.success ? output.message : undefined,
  );

  return {
    details: {
      type: 'MCP_TOOL_CALL',
      connectionId: input.connectionId ?? '',
      toolName: input.toolName ?? '',
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
