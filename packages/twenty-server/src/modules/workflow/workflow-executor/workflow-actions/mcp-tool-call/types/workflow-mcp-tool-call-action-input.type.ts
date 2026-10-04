export type WorkflowMcpToolCallActionInput = {
  connectionId?: string | null;
  toolName?: string | null;
  arguments?: {
    // oxlint-disable-next-line typescript/no-explicit-any
    [key: string]: any;
  };
};
