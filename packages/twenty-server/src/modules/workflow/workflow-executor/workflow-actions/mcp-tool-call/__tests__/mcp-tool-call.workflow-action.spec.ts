import { Test, type TestingModule } from '@nestjs/testing';

import { WorkflowActionType } from 'twenty-shared/workflow';

import { McpToolCallTool } from 'src/engine/core-modules/mcp-connection/tools/mcp-tool-call.tool';
import { McpToolCallWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/mcp-tool-call/mcp-tool-call.workflow-action';
import { type WorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { WorkflowRunStepLogWorkspaceService } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run-step-log.workspace-service';

const baseSettings: WorkflowActionSettings = {
  outputSchema: {},
  errorHandlingOptions: {
    retryOnFailure: { value: false },
    continueOnFailure: { value: false },
  },
  input: {},
};

const buildMcpToolCallStep = (input: Record<string, unknown>): WorkflowAction =>
  ({
    id: 'step-1',
    type: WorkflowActionType.MCP_TOOL_CALL,
    name: 'MCP Tool',
    valid: true,
    settings: { ...baseSettings, input },
  }) as WorkflowAction;

const runInfo = { workspaceId: 'workspace-1', workflowRunId: 'run-1' };

describe('McpToolCallWorkflowAction', () => {
  let action: McpToolCallWorkflowAction;
  let mockMcpToolCallTool: jest.Mocked<Pick<McpToolCallTool, 'execute'>>;
  let mockSetStepLog: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockMcpToolCallTool = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        message: '{"companies":[{"name":"Acme"}]}',
        result: { companies: [{ name: 'Acme' }] },
      }),
    };
    mockSetStepLog = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpToolCallWorkflowAction,
        { provide: McpToolCallTool, useValue: mockMcpToolCallTool },
        {
          provide: WorkflowRunStepLogWorkspaceService,
          useValue: { setStepLog: mockSetStepLog },
        },
      ],
    }).compile();

    action = module.get(McpToolCallWorkflowAction);
  });

  it('resolves variables in the tool arguments and returns the tool result', async () => {
    const output = await action.execute({
      currentStepId: 'step-1',
      steps: [
        buildMcpToolCallStep({
          connectionId: 'connection-1',
          toolName: 'search_companies',
          arguments: { query: '{{trigger.industry}}', limit: 5 },
        }),
      ],
      context: { trigger: { industry: 'fintech' } },
      runInfo,
    });

    expect(mockMcpToolCallTool.execute).toHaveBeenCalledWith(
      {
        connectionId: 'connection-1',
        toolName: 'search_companies',
        arguments: { query: 'fintech', limit: 5 },
      },
      expect.objectContaining({ workspaceId: 'workspace-1' }),
    );
    expect(output).toEqual({
      result: { companies: [{ name: 'Acme' }] },
      error: undefined,
    });
  });

  it('surfaces a failed tool call as a step error and logs it', async () => {
    mockMcpToolCallTool.execute.mockResolvedValue({
      success: false,
      message: 'Rate limited',
      error: 'Rate limited',
    });

    const output = await action.execute({
      currentStepId: 'step-1',
      steps: [
        buildMcpToolCallStep({
          connectionId: 'connection-1',
          toolName: 'search_companies',
          arguments: {},
        }),
      ],
      context: {},
      runInfo,
    });

    expect(output.error).toBe('Rate limited');
    expect(mockSetStepLog).toHaveBeenCalledWith(
      expect.objectContaining({
        stepId: 'step-1',
        stepLog: expect.objectContaining({
          details: expect.objectContaining({
            type: 'MCP_TOOL_CALL',
            toolName: 'search_companies',
            error: 'Rate limited',
            result: undefined,
          }),
        }),
      }),
    );
  });

  it('rejects a step of another type', async () => {
    await expect(
      action.execute({
        currentStepId: 'step-1',
        steps: [
          {
            ...buildMcpToolCallStep({}),
            type: WorkflowActionType.HTTP_REQUEST,
          } as WorkflowAction,
        ],
        context: {},
        runInfo,
      }),
    ).rejects.toThrow('Step is not an MCP tool call action');
  });
});
