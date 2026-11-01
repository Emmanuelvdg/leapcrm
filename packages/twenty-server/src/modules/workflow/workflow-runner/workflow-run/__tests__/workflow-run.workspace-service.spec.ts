import { Test, type TestingModule } from '@nestjs/testing';

import { StepStatus, type WorkflowRunStepInfos } from 'twenty-shared/workflow';

import { CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { MetricsService } from 'src/engine/core-modules/metrics/metrics.service';
import { RecordPositionService } from 'src/engine/core-modules/record-position/services/record-position.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import {
  WorkflowRunStatus,
  type WorkflowRunWorkspaceEntity,
} from 'src/modules/workflow/common/standard-objects/workflow-run.workspace-entity';
import { WorkflowCommonWorkspaceService } from 'src/modules/workflow/common/workspace-services/workflow-common.workspace-service';
import { createMockCodeStep } from 'src/modules/workflow/workflow-executor/utils/create-mock-workflow-steps.util';
import { WorkflowRunWorkspaceService } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run.workspace-service';

const WORKSPACE_ID = 'workspace-id';
const WORKFLOW_RUN_ID = 'workflow-run-id';

const buildWorkflowRun = (stepInfos: WorkflowRunStepInfos) =>
  ({
    id: WORKFLOW_RUN_ID,
    status: WorkflowRunStatus.RUNNING,
    state: {
      flow: {
        trigger: {},
        steps: [
          { ...createMockCodeStep('build'), name: 'Build payload' },
          { ...createMockCodeStep('notify'), name: 'Notify team' },
        ],
      },
      stepInfos,
    },
  }) as unknown as WorkflowRunWorkspaceEntity;

describe('WorkflowRunWorkspaceService', () => {
  let service: WorkflowRunWorkspaceService;
  let updateWorkflowRunSpy: jest.SpyInstance;

  const mockWorkflowRun = (stepInfos: WorkflowRunStepInfos) =>
    jest
      .spyOn(service, 'getWorkflowRunOrFail')
      .mockResolvedValue(buildWorkflowRun(stepInfos));

  const getPersistedState = () =>
    updateWorkflowRunSpy.mock.calls[0][0].partialUpdate.state;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowRunWorkspaceService,
        { provide: GlobalWorkspaceOrmManager, useValue: {} },
        { provide: WorkflowCommonWorkspaceService, useValue: {} },
        { provide: RecordPositionService, useValue: {} },
        {
          provide: MetricsService,
          useValue: { incrementCounterForEvent: jest.fn() },
        },
        {
          provide: CacheLockService,
          useValue: {
            withLock: (callback: () => Promise<unknown>) => callback(),
          },
        },
      ],
    }).compile();

    service = module.get(WorkflowRunWorkspaceService);
    updateWorkflowRunSpy = jest
      .spyOn(service, 'updateWorkflowRun')
      .mockResolvedValue(undefined);
  });

  describe('endWorkflowRun', () => {
    it('names the failed step in the run error', async () => {
      mockWorkflowRun({
        build: {
          status: StepStatus.FAILED,
          error: 'Unexpected token',
          errorDetails: {
            message: 'Unexpected token',
            phase: 'EXECUTE',
            isSystemError: false,
          },
        },
        notify: { status: StepStatus.NOT_STARTED },
      });

      await service.endWorkflowRun({
        workflowRunId: WORKFLOW_RUN_ID,
        workspaceId: WORKSPACE_ID,
        status: WorkflowRunStatus.FAILED,
        error: 'WorkflowRun failed',
        failedStepId: 'build',
      });

      const state = getPersistedState();

      expect(state.failedStepId).toBe('build');
      expect(state.workflowRunError).toBe(
        'Step "Build payload" (CODE) failed: Unexpected token',
      );
      expect(state.stepInfos.build.status).toBe(StepStatus.FAILED);
      expect(state.stepInfos.notify.status).toBe(StepStatus.NOT_STARTED);
    });

    it('attaches an engine error to the step that was running instead of the generic message', async () => {
      mockWorkflowRun({
        build: { status: StepStatus.RUNNING },
        notify: { status: StepStatus.RUNNING },
      });

      await service.endWorkflowRun({
        workflowRunId: WORKFLOW_RUN_ID,
        workspaceId: WORKSPACE_ID,
        status: WorkflowRunStatus.FAILED,
        error: 'Lock timeout',
        isSystemError: true,
        failedStepId: 'build',
        failedStepErrorDetails: {
          message: 'Lock timeout',
          phase: 'ORCHESTRATION',
          isSystemError: true,
        },
      });

      const state = getPersistedState();

      expect(state.workflowRunError).toBe(
        'Workflow engine error at step "Build payload" (CODE): Lock timeout',
      );
      expect(state.stepInfos.build).toMatchObject({
        status: StepStatus.FAILED,
        error: 'Lock timeout',
        errorDetails: { phase: 'ORCHESTRATION' },
        endedAt: expect.any(String),
      });
      expect(state.stepInfos.notify).toMatchObject({
        status: StepStatus.FAILED,
        error: 'Workflow has been ended before this step was completed',
      });
    });

    it('marks a step that failed before the run started', async () => {
      mockWorkflowRun({
        build: { status: StepStatus.NOT_STARTED },
        notify: { status: StepStatus.NOT_STARTED },
      });

      await service.endWorkflowRun({
        workflowRunId: WORKFLOW_RUN_ID,
        workspaceId: WORKSPACE_ID,
        status: WorkflowRunStatus.FAILED,
        error: 'Build failed',
        isSystemError: true,
        failedStepId: 'build',
        failedStepErrorDetails: {
          message: 'Build failed',
          phase: 'PREFLIGHT',
          isSystemError: false,
        },
      });

      const state = getPersistedState();

      expect(state.workflowRunError).toBe(
        'Step "Build payload" (CODE) could not be prepared: Build failed',
      );
      expect(state.stepInfos.build.status).toBe(StepStatus.FAILED);
      expect(state.stepInfos.notify.status).toBe(StepStatus.NOT_STARTED);
    });

    it('keeps the status of a step that had already finished', async () => {
      mockWorkflowRun({
        build: { status: StepStatus.SUCCESS, result: {} },
        notify: { status: StepStatus.NOT_STARTED },
      });

      await service.endWorkflowRun({
        workflowRunId: WORKFLOW_RUN_ID,
        workspaceId: WORKSPACE_ID,
        status: WorkflowRunStatus.FAILED,
        error: 'Queue unavailable',
        failedStepId: 'build',
        failedStepErrorDetails: {
          message: 'Queue unavailable',
          phase: 'ORCHESTRATION',
          isSystemError: true,
        },
      });

      const state = getPersistedState();

      expect(state.failedStepId).toBe('build');
      expect(state.stepInfos.build.status).toBe(StepStatus.SUCCESS);
      expect(state.workflowRunError).toBe(
        'Workflow engine error at step "Build payload" (CODE): Queue unavailable',
      );
    });

    it('keeps the plain run error when no step is attributed', async () => {
      mockWorkflowRun({ build: { status: StepStatus.NOT_STARTED } });

      await service.endWorkflowRun({
        workflowRunId: WORKFLOW_RUN_ID,
        workspaceId: WORKSPACE_ID,
        status: WorkflowRunStatus.FAILED,
        error: 'Throttle limit reached',
      });

      const state = getPersistedState();

      expect(state.failedStepId).toBeUndefined();
      expect(state.workflowRunError).toBe('Throttle limit reached');
    });
  });

  describe('updateWorkflowRunStepInfo', () => {
    it('stamps the start of a running step', async () => {
      mockWorkflowRun({ build: { status: StepStatus.NOT_STARTED } });

      await service.updateWorkflowRunStepInfo({
        stepId: 'build',
        stepInfo: { status: StepStatus.RUNNING },
        workflowRunId: WORKFLOW_RUN_ID,
        workspaceId: WORKSPACE_ID,
      });

      expect(getPersistedState().stepInfos.build).toMatchObject({
        status: StepStatus.RUNNING,
        startedAt: expect.any(String),
      });
      expect(getPersistedState().stepInfos.build.endedAt).toBeUndefined();
    });

    it('keeps the start, stamps the end and stores the error details of a failed step', async () => {
      const startedAt = '2026-11-01T10:00:00.000Z';

      mockWorkflowRun({ build: { status: StepStatus.RUNNING, startedAt } });

      await service.updateWorkflowRunStepInfo({
        stepId: 'build',
        stepInfo: {
          status: StepStatus.FAILED,
          error: 'Unexpected token',
          errorDetails: {
            message: 'Unexpected token',
            phase: 'EXECUTE',
            isSystemError: false,
            emptyVariables: ['{{trigger.object.name}}'],
          },
        },
        workflowRunId: WORKFLOW_RUN_ID,
        workspaceId: WORKSPACE_ID,
      });

      expect(getPersistedState().stepInfos.build).toMatchObject({
        status: StepStatus.FAILED,
        startedAt,
        endedAt: expect.any(String),
        errorDetails: { emptyVariables: ['{{trigger.object.name}}'] },
      });
    });
  });
});
