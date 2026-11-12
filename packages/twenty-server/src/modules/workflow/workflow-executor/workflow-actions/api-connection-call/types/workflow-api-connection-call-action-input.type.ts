export type WorkflowApiConnectionCallActionInput = {
  connectionId?: string | null;
  operationName?: string | null;
  // Indexed `any` like the MCP step: an `unknown` value breaks TypeORM's
  // QueryDeepPartialEntity for every WorkflowAction[] write.
  arguments?: {
    // oxlint-disable-next-line typescript/no-explicit-any
    [key: string]: any;
  };
};
