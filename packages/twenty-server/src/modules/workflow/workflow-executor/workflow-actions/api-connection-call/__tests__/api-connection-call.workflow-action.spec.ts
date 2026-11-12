import { Test, type TestingModule } from '@nestjs/testing';

import { WorkflowActionType } from 'twenty-shared/workflow';

import { ApiConnectionCallTool } from 'src/engine/core-modules/api-connection/tools/api-connection-call.tool';
import { ApiConnectionCallWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/api-connection-call/api-connection-call.workflow-action';
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

const buildStep = (
  type: WorkflowActionType,
  input: Record<string, unknown>,
): WorkflowAction =>
  ({
    id: 'step-1',
    type,
    name: 'API Call',
    valid: true,
    settings: { ...baseSettings, input },
  }) as WorkflowAction;

const runInfo = { workspaceId: 'workspace-1', workflowRunId: 'run-1' };

describe('ApiConnectionCallWorkflowAction', () => {
  let action: ApiConnectionCallWorkflowAction;
  let mockTool: jest.Mocked<Pick<ApiConnectionCallTool, 'execute'>>;
  let mockSetStepLog: jest.Mock;

  beforeEach(async () => {
    mockTool = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        message: 'POST /api/v1/contacts/search/count returned 200',
        result: { count: 1200 },
        status: 200,
        request: {
          method: 'POST',
          url: 'https://app.getleads.io/api/v1/contacts/search/count',
        },
      }),
    };
    mockSetStepLog = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiConnectionCallWorkflowAction,
        { provide: ApiConnectionCallTool, useValue: mockTool },
        {
          provide: WorkflowRunStepLogWorkspaceService,
          useValue: { setStepLog: mockSetStepLog },
        },
      ],
    }).compile();

    action = module.get(ApiConnectionCallWorkflowAction);
  });

  it('resolves variables, calls the operation and logs the request without headers', async () => {
    const output = await action.execute({
      currentStepId: 'step-1',
      steps: [
        buildStep(WorkflowActionType.API_CONNECTION_CALL, {
          connectionId: 'connection-1',
          operationName: 'search_contacts_count',
          arguments: { company_size_min: '{{trigger.size}}' },
        }),
      ],
      context: { trigger: { size: 50 } },
      runInfo,
    });

    expect(mockTool.execute).toHaveBeenCalledWith(
      {
        connectionId: 'connection-1',
        operationName: 'search_contacts_count',
        arguments: { company_size_min: 50 },
      },
      { workspaceId: 'workspace-1' },
    );
    expect(output).toEqual({ result: { count: 1200 }, error: undefined });

    const stepLog = mockSetStepLog.mock.calls[0][0].stepLog;

    expect(stepLog.details).toMatchObject({
      type: 'API_CONNECTION_CALL',
      connectionId: 'connection-1',
      operationName: 'search_contacts_count',
      method: 'POST',
      url: 'https://app.getleads.io/api/v1/contacts/search/count',
      status: 200,
      arguments: '{"company_size_min":50}',
      result: '{"count":1200}',
    });
    expect(JSON.stringify(stepLog)).not.toMatch(/authorization/i);
  });

  it('returns the tool error so the step fails', async () => {
    mockTool.execute.mockResolvedValue({
      success: false,
      message: 'POST /x failed with 500: boom',
      error: 'POST /x failed with 500: boom',
    });

    const output = await action.execute({
      currentStepId: 'step-1',
      steps: [
        buildStep(WorkflowActionType.API_CONNECTION_CALL, {
          connectionId: 'connection-1',
          operationName: 'search_contacts_count',
        }),
      ],
      context: {},
      runInfo,
    });

    expect(output.error).toBe('POST /x failed with 500: boom');
  });

  it('rejects steps of another type', async () => {
    await expect(
      action.execute({
        currentStepId: 'step-1',
        steps: [buildStep(WorkflowActionType.MCP_TOOL_CALL, {})],
        context: {},
        runInfo,
      }),
    ).rejects.toThrow('Step is not an API connection call action');
  });
});
