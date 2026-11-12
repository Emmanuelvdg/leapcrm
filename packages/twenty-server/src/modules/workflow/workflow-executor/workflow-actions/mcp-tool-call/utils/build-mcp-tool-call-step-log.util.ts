import { type WorkflowRunStepLog } from 'twenty-shared/workflow';

import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { type WorkflowMcpToolCallActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/mcp-tool-call/types/workflow-mcp-tool-call-action-input.type';
import { serializeStepLogPayload } from 'src/modules/workflow/workflow-executor/workflow-actions/tool-backed/utils/serialize-step-log-payload.util';

export const buildMcpToolCallStepLog = ({
  input,
  output,
  durationMs,
}: {
  input: WorkflowMcpToolCallActionInput;
  output: ToolOutput;
  durationMs: number;
}): WorkflowRunStepLog => {
  const serializedArguments = serializeStepLogPayload(input.arguments);
  const serializedResult = serializeStepLogPayload(
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
