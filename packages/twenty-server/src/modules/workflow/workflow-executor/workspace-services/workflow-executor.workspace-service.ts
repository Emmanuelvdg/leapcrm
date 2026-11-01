import { Injectable, Logger } from '@nestjs/common';

import omit from 'lodash.omit';
import { isDefined } from 'twenty-shared/utils';
import {
  getWorkflowRunContext,
  StepStatus,
  WorkflowRunStepInfo,
  WorkflowRunStepInfos,
} from 'twenty-shared/workflow';

import { NO_BILLING_SUBSCRIPTION } from 'src/engine/core-modules/billing/constants/no-billing-subscription.constant';
import { BillingUsageService } from 'src/engine/core-modules/billing/services/billing-usage.service';
import { BillingService } from 'src/engine/core-modules/billing/services/billing.service';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { MetricsService } from 'src/engine/core-modules/metrics/metrics.service';
import { MetricsKeys } from 'src/engine/core-modules/metrics/types/metrics-keys.type';
import { USAGE_RECORDED } from 'src/engine/core-modules/usage/constants/usage-recorded.constant';
import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { UsageResourceType } from 'src/engine/core-modules/usage/enums/usage-resource-type.enum';
import { UsageUnit } from 'src/engine/core-modules/usage/enums/usage-unit.enum';
import { type UsageEvent } from 'src/engine/core-modules/usage/types/usage-event.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';
import { WorkflowRunStatus } from 'src/modules/workflow/common/standard-objects/workflow-run.workspace-entity';
import { workflowHasRunningSteps } from 'src/modules/workflow/common/utils/workflow-has-running-steps.util';
import { WorkflowStepAttributedException } from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-attributed.exception';
import { WorkflowActionFactory } from 'src/modules/workflow/workflow-executor/factories/workflow-action.factory';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import {
  type WorkflowBranchExecutorInput,
  type WorkflowExecutorInput,
} from 'src/modules/workflow/workflow-executor/types/workflow-executor-input';
import { buildStepFailureInputSnapshot } from 'src/modules/workflow/workflow-executor/utils/build-step-failure-input-snapshot.util';
import { buildWorkflowStepErrorDetails } from 'src/modules/workflow/workflow-executor/utils/build-workflow-step-error-details.util';
import { findFirstFailedStepId } from 'src/modules/workflow/workflow-executor/utils/find-first-failed-step-id.util';
import { isWorkflowStepUserError } from 'src/modules/workflow/workflow-executor/utils/is-workflow-step-user-error.util';
import { shouldExecuteStep } from 'src/modules/workflow/workflow-executor/utils/should-execute-step.util';
import { shouldFailSafely } from 'src/modules/workflow/workflow-executor/utils/should-fail-safely.util';
import { shouldSkipStepExecution } from 'src/modules/workflow/workflow-executor/utils/should-skip-step-execution.util';
import { workflowShouldFail } from 'src/modules/workflow/workflow-executor/utils/workflow-should-fail.util';
import { workflowShouldKeepRunning } from 'src/modules/workflow/workflow-executor/utils/workflow-should-keep-running.util';
import { isWorkflowIfElseAction } from 'src/modules/workflow/workflow-executor/workflow-actions/if-else/guards/is-workflow-if-else-action.guard';
import { getNextStepIdsForIfElse } from 'src/modules/workflow/workflow-executor/workflow-actions/if-else/utils/get-next-step-ids-for-if-else.util';
import { isWorkflowIteratorAction } from 'src/modules/workflow/workflow-executor/workflow-actions/iterator/guards/is-workflow-iterator-action.guard';
import { findEnclosingIteratorWithContinueOnFailure } from 'src/modules/workflow/workflow-executor/workflow-actions/iterator/utils/find-enclosing-iterator-with-continue-on-failure.util';
import { getNextStepIdsForIterator } from 'src/modules/workflow/workflow-executor/workflow-actions/iterator/utils/get-next-step-ids-for-iterator.util';
import { WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { RUN_WORKFLOW_JOB_NAME } from 'src/modules/workflow/workflow-runner/constants/run-workflow-job-name';
import { type RunWorkflowJobData } from 'src/modules/workflow/workflow-runner/types/run-workflow-job-data.type';
import { buildRunWorkflowJobOptions } from 'src/modules/workflow/workflow-runner/utils/build-run-workflow-job-options.util';
import { WorkflowRunWorkspaceService } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run.workspace-service';

const MAX_EXECUTED_STEPS_COUNT = 20;

@Injectable()
export class WorkflowExecutorWorkspaceService {
  private readonly logger = new Logger(WorkflowExecutorWorkspaceService.name);

  constructor(
    private readonly workflowActionFactory: WorkflowActionFactory,
    private readonly workspaceEventEmitter: WorkspaceEventEmitter,
    private readonly workflowRunWorkspaceService: WorkflowRunWorkspaceService,
    private readonly billingService: BillingService,
    private readonly billingUsageService: BillingUsageService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly exceptionHandlerService: ExceptionHandlerService,
    private readonly metricsService: MetricsService,
    @InjectMessageQueue(MessageQueue.workflowQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async executeFromSteps({
    stepIds,
    workflowRunId,
    workspaceId,
    shouldComputeWorkflowRunStatus = true,
    executedStepsCount = 0,
  }: WorkflowExecutorInput) {
    await Promise.all(
      stepIds.map(async (stepIdToExecute) => {
        return this.executeFromStep({
          stepId: stepIdToExecute,
          workflowRunId,
          workspaceId,
          executedStepsCount,
        });
      }),
    );

    if (shouldComputeWorkflowRunStatus) {
      await this.computeWorkflowRunStatus({
        workflowRunId,
        workspaceId,
      });
    }
  }

  private async executeFromStep(input: WorkflowBranchExecutorInput) {
    try {
      await this.executeStepAndContinue(input);
    } catch (error) {
      if (error instanceof WorkflowStepAttributedException) {
        throw error;
      }

      throw new WorkflowStepAttributedException({
        stepId: input.stepId,
        phase: 'ORCHESTRATION',
        originalError: error,
      });
    }
  }

  private async executeStepAndContinue({
    stepId,
    workflowRunId,
    workspaceId,
    executedStepsCount,
  }: WorkflowBranchExecutorInput): Promise<void> {
    const workflowRun =
      await this.workflowRunWorkspaceService.getWorkflowRunOrFail({
        workflowRunId,
        workspaceId,
      });

    const stepInfos = workflowRun.state.stepInfos;

    const steps = workflowRun.state.flow.steps;

    const stepToExecute = steps.find((step) => step.id === stepId);

    if (!stepToExecute) {
      await this.workflowRunWorkspaceService.endWorkflowRun({
        workflowRunId,
        workspaceId,
        status: WorkflowRunStatus.FAILED,
        error: 'Step not found',
        isSystemError: true,
      });

      return;
    }

    let actionOutput: WorkflowActionOutput;
    let executionDurationMs: number | undefined;

    if (
      shouldExecuteStep({
        step: stepToExecute,
        steps,
        stepInfos,
        workflowRunStatus: workflowRun.status,
      })
    ) {
      const executionStartTime = Date.now();

      actionOutput = await this.executeStep({
        step: stepToExecute,
        steps,
        stepInfos,
        workflowRunId,
        workspaceId,
      });

      executionDurationMs = Date.now() - executionStartTime;

      if (isDefined(actionOutput.error)) {
        const enclosingIterator = findEnclosingIteratorWithContinueOnFailure({
          failedStepId: stepId,
          steps,
        });

        const errorDetails = {
          ...(actionOutput.errorDetails ??
            buildWorkflowStepErrorDetails({
              error: actionOutput.error,
              phase: 'EXECUTE',
              isSystemError: false,
            })),
          ...buildStepFailureInputSnapshot({
            step: stepToExecute,
            context: getWorkflowRunContext(stepInfos),
          }),
        };

        // A failure absorbed by the loop can repeat for every item and each one is kept in the run state
        actionOutput.errorDetails = isDefined(enclosingIterator)
          ? omit(errorDetails, [
              'stack',
              'resolvedInput',
              'resolvedInputTruncated',
            ])
          : errorDetails;

        if (isDefined(enclosingIterator)) {
          actionOutput.shouldFailSafely = true;
        }
      }
    } else if (
      shouldFailSafely({
        step: stepToExecute,
        steps,
        stepInfos,
      })
    ) {
      actionOutput = {
        shouldFailSafely: true,
      };
    } else if (
      shouldSkipStepExecution({
        step: stepToExecute,
        steps,
        stepInfos,
      })
    ) {
      actionOutput = {
        shouldSkipStepExecution: true,
      };
    } else {
      return;
    }

    const isError =
      isDefined(actionOutput.error) && !actionOutput.shouldFailSafely;

    if (
      !isError &&
      !actionOutput.shouldFailSafely &&
      !actionOutput.shouldSkipStepExecution
    ) {
      await this.sendWorkflowNodeRunEvent(workspaceId, workflowRun.workflowId);
    }

    const { shouldProcessNextSteps } = await this.processStepExecutionResult({
      actionOutput,
      step: stepToExecute,
      executionDurationMs,
      workflowRunId,
      workspaceId,
    });

    if (!shouldProcessNextSteps) {
      return;
    }

    const shouldRunAnotherJob =
      executedStepsCount && executedStepsCount > MAX_EXECUTED_STEPS_COUNT;

    if (shouldRunAnotherJob) {
      await this.continueExecutionFromStepInAnotherJob({
        lastExecutedStepId: stepId,
        workflowRunId,
        workspaceId,
      });

      return;
    }

    const { nextStepIdsToExecute, nextStepIdsToSkip, nextStepIdsToFailSafely } =
      await this.getNextStepIdsToExecute({
        executedStep: stepToExecute,
        executedStepOutput: actionOutput,
      });

    if (isDefined(nextStepIdsToSkip) || isDefined(nextStepIdsToFailSafely)) {
      await this.skipAndFailSafelyStepsThenContinue({
        stepIdsToSkip: nextStepIdsToSkip ?? [],
        stepIdsToFailSafely: nextStepIdsToFailSafely ?? [],
        steps,
        workflowRunId,
        workspaceId,
        executedStepsCount: (executedStepsCount ?? 0) + 1,
      });
    }

    if (isDefined(nextStepIdsToExecute) && nextStepIdsToExecute.length > 0) {
      await this.executeFromSteps({
        stepIds: nextStepIdsToExecute,
        workflowRunId,
        workspaceId,
        shouldComputeWorkflowRunStatus: false,
        executedStepsCount: (executedStepsCount ?? 0) + 1,
      });
    }
  }

  async getNextStepIdsToExecute({
    executedStep,
    executedStepOutput,
  }: {
    executedStep: WorkflowAction;
    executedStepOutput: WorkflowActionOutput;
  }): Promise<{
    nextStepIdsToExecute?: string[];
    nextStepIdsToSkip?: string[];
    nextStepIdsToFailSafely?: string[];
  }> {
    if (isWorkflowIteratorAction(executedStep)) {
      const result = getNextStepIdsForIterator({
        executedStep,
        executedStepOutput,
      });

      if (result) {
        return result;
      }
    }

    if (isWorkflowIfElseAction(executedStep)) {
      return getNextStepIdsForIfElse({ executedStep });
    }

    return { nextStepIdsToExecute: executedStep.nextStepIds };
  }

  private async computeWorkflowRunStatus({
    workflowRunId,
    workspaceId,
  }: {
    workflowRunId: string;
    workspaceId: string;
  }) {
    const workflowRun =
      await this.workflowRunWorkspaceService.getWorkflowRunOrFail({
        workflowRunId,
        workspaceId,
      });

    const stepInfos = workflowRun.state.stepInfos;

    const steps = workflowRun.state.flow.steps;

    if (workflowRun.status === WorkflowRunStatus.STOPPING) {
      if (!workflowHasRunningSteps({ stepInfos, steps })) {
        await this.workflowRunWorkspaceService.endWorkflowRun({
          workflowRunId,
          workspaceId,
          status: WorkflowRunStatus.STOPPED,
        });
      }

      return;
    }

    if (workflowShouldFail({ stepInfos, steps })) {
      await this.workflowRunWorkspaceService.endWorkflowRun({
        workflowRunId,
        workspaceId,
        status: WorkflowRunStatus.FAILED,
        error: 'WorkflowRun failed',
        failedStepId: findFirstFailedStepId({ steps, stepInfos }),
      });

      return;
    }

    if (workflowShouldKeepRunning({ stepInfos, steps })) {
      return;
    }

    await this.workflowRunWorkspaceService.endWorkflowRun({
      workflowRunId,
      workspaceId,
      status: WorkflowRunStatus.COMPLETED,
    });
  }

  private async sendWorkflowNodeRunEvent(
    workspaceId: string,
    workflowId: string,
  ) {
    let periodStart: Date | undefined;
    if (this.billingService.isBillingEnabled()) {
      const { currentBillingSubscription } =
        await this.workspaceCacheService.getOrRecompute(workspaceId, [
          'currentBillingSubscription',
        ]);

      if (currentBillingSubscription !== NO_BILLING_SUBSCRIPTION) {
        periodStart = currentBillingSubscription.currentPeriodStart;

        await this.billingUsageService.decrementAvailableCreditsInCache({
          workspaceId,
          usedCredits: 100,
        });
      }
    }

    this.workspaceEventEmitter.emitCustomBatchEvent<UsageEvent>(
      USAGE_RECORDED,
      [
        {
          resourceType: UsageResourceType.WORKFLOW,
          operationType: UsageOperationType.WORKFLOW_EXECUTION,
          creditsUsedMicro: 100,
          quantity: 1,
          unit: UsageUnit.INVOCATION,
          resourceId: workflowId,
          periodStart,
        },
      ],
      workspaceId,
    );
  }

  private async processStepExecutionResult({
    actionOutput,
    step,
    executionDurationMs,
    workflowRunId,
    workspaceId,
  }: {
    actionOutput: WorkflowActionOutput;
    step: WorkflowAction;
    executionDurationMs?: number;
    workflowRunId: string;
    workspaceId: string;
  }): Promise<{ shouldProcessNextSteps: boolean }> {
    const stepId = step.id;
    const isPendingEvent = actionOutput.pendingEvent;
    const isSuccess = isDefined(actionOutput.result);
    const isStopped = actionOutput.shouldEndWorkflowRun ?? false;
    const isNotFinished = actionOutput.shouldRemainRunning ?? false;
    const isSkipped = actionOutput.shouldSkipStepExecution ?? false;
    const isFailedSafely = actionOutput.shouldFailSafely ?? false;

    let stepInfo: WorkflowRunStepInfo;

    if (isPendingEvent) {
      stepInfo = {
        status: StepStatus.PENDING,
      };
    } else if (isStopped) {
      stepInfo = {
        status: StepStatus.STOPPED,
        result: actionOutput?.result,
      };
    } else if (isNotFinished) {
      stepInfo = {
        status: StepStatus.RUNNING,
        result: actionOutput?.result,
      };
    } else if (isFailedSafely) {
      stepInfo = {
        status: StepStatus.FAILED_SAFELY,
        error: actionOutput?.error,
        errorDetails: actionOutput?.errorDetails,
      };
    } else if (isSuccess) {
      stepInfo = {
        status: StepStatus.SUCCESS,
        result: actionOutput?.result,
      };
    } else if (isSkipped) {
      stepInfo = {
        status: StepStatus.SKIPPED,
      };
    } else {
      stepInfo = {
        status: StepStatus.FAILED,
        error: actionOutput?.error,
        errorDetails: actionOutput?.errorDetails,
      };
    }

    await this.workflowRunWorkspaceService.updateWorkflowRunStepInfo({
      stepId,
      stepInfo,
      workflowRunId,
      workspaceId,
    });

    this.logStepTransition({
      step,
      stepInfo,
      executionDurationMs,
      workflowRunId,
      workspaceId,
    });

    return {
      shouldProcessNextSteps:
        isSuccess || isStopped || isSkipped || isFailedSafely,
    };
  }

  private async executeStep({
    step,
    steps,
    stepInfos,
    workflowRunId,
    workspaceId,
  }: {
    step: WorkflowAction;
    steps: WorkflowAction[];
    stepInfos: WorkflowRunStepInfos;
    workflowRunId: string;
    workspaceId: string;
  }) {
    // Credit-cap enforcement lives at the AI entry points (chat resolver,
    // executeAgent, generate-text controller, title generation). Cheap
    // workflow steps (DB CRUD, branching, actions) are not gated here so a
    // chat-driven cap exhaustion does not block non-AI automations.
    const stepId = step.id;

    const workflowAction = this.workflowActionFactory.get(step.type);

    await this.workflowRunWorkspaceService.updateWorkflowRunStepInfo({
      stepId,
      stepInfo: {
        ...stepInfos[stepId],
        status: StepStatus.RUNNING,
        errorDetails: undefined,
      },
      workflowRunId,
      workspaceId,
    });

    try {
      return await workflowAction.execute({
        currentStepId: stepId,
        steps,
        context: getWorkflowRunContext(stepInfos),
        runInfo: {
          workflowRunId,
          workspaceId,
        },
      });
    } catch (error) {
      const isSystemError = !isWorkflowStepUserError(error);

      if (isSystemError) {
        this.exceptionHandlerService.captureExceptions([error], {
          workspace: { id: workspaceId },
        });

        await this.metricsService.incrementCounterForEvent({
          key: MetricsKeys.WorkflowRunSystemError,
          eventId: workflowRunId,
          debugLog: `[Workflow Run System Error] Workflow run ${workflowRunId} in workspace ${workspaceId} ended with system error`,
        });
      }

      return {
        error: error.message ?? 'Execution result error, no data or error',
        errorDetails: buildWorkflowStepErrorDetails({
          error,
          phase: 'EXECUTE',
          isSystemError,
        }),
      };
    }
  }

  private logStepTransition({
    step,
    stepInfo,
    executionDurationMs,
    workflowRunId,
    workspaceId,
  }: {
    step: WorkflowAction;
    stepInfo: WorkflowRunStepInfo;
    executionDurationMs?: number;
    workflowRunId: string;
    workspaceId: string;
  }) {
    const logMessage = `Workflow step ${stepInfo.status}: workflowRun=${workflowRunId} workspace=${workspaceId} step=${step.id} type=${step.type}${
      isDefined(executionDurationMs) ? ` durationMs=${executionDurationMs}` : ''
    }${isDefined(stepInfo.error) ? ` error=${JSON.stringify(stepInfo.error)}` : ''}`;

    // Successful steps are high-volume, failures must always reach the logs
    if (
      stepInfo.status === StepStatus.FAILED ||
      stepInfo.status === StepStatus.FAILED_SAFELY
    ) {
      this.logger.warn(logMessage);
    } else {
      this.logger.debug(logMessage);
    }
  }

  async skipAndFailSafelyStepsThenContinue({
    stepIdsToSkip,
    stepIdsToFailSafely,
    steps,
    workflowRunId,
    workspaceId,
    executedStepsCount,
  }: {
    stepIdsToSkip: string[];
    stepIdsToFailSafely: string[];
    steps: WorkflowAction[];
    workflowRunId: string;
    workspaceId: string;
    executedStepsCount: number;
  }) {
    const stepInfos: Record<string, WorkflowRunStepInfo> = {};

    for (const stepId of stepIdsToSkip) {
      stepInfos[stepId] = { status: StepStatus.SKIPPED };
    }

    for (const stepId of stepIdsToFailSafely) {
      stepInfos[stepId] = { status: StepStatus.FAILED_SAFELY };
    }

    await this.workflowRunWorkspaceService.updateWorkflowRunStepInfos({
      stepInfos,
      workflowRunId,
      workspaceId,
    });

    const nextStepIdsToExecute = new Set<string>();
    const cascadedStepIdsToSkip: string[] = [];
    const cascadedStepIdsToFailSafely: string[] = [];

    for (const stepId of stepIdsToSkip) {
      const step = steps.find((candidate) => candidate.id === stepId);

      if (!step) {
        continue;
      }

      const result = await this.getNextStepIdsToExecute({
        executedStep: step,
        executedStepOutput: { shouldSkipStepExecution: true },
      });

      for (const id of result.nextStepIdsToExecute ?? []) {
        nextStepIdsToExecute.add(id);
      }
      cascadedStepIdsToSkip.push(...(result.nextStepIdsToSkip ?? []));
      cascadedStepIdsToFailSafely.push(
        ...(result.nextStepIdsToFailSafely ?? []),
      );
    }

    for (const stepId of stepIdsToFailSafely) {
      const step = steps.find((candidate) => candidate.id === stepId);

      if (!step) {
        continue;
      }

      const result = await this.getNextStepIdsToExecute({
        executedStep: step,
        executedStepOutput: { shouldFailSafely: true },
      });

      for (const id of result.nextStepIdsToExecute ?? []) {
        nextStepIdsToExecute.add(id);
      }
      cascadedStepIdsToSkip.push(...(result.nextStepIdsToSkip ?? []));
      cascadedStepIdsToFailSafely.push(
        ...(result.nextStepIdsToFailSafely ?? []),
      );
    }

    if (
      cascadedStepIdsToSkip.length > 0 ||
      cascadedStepIdsToFailSafely.length > 0
    ) {
      await this.skipAndFailSafelyStepsThenContinue({
        stepIdsToSkip: cascadedStepIdsToSkip,
        stepIdsToFailSafely: cascadedStepIdsToFailSafely,
        steps,
        workflowRunId,
        workspaceId,
        executedStepsCount,
      });
    }

    if (nextStepIdsToExecute.size > 0) {
      await this.executeFromSteps({
        stepIds: Array.from(nextStepIdsToExecute),
        workflowRunId,
        workspaceId,
        shouldComputeWorkflowRunStatus: false,
        executedStepsCount,
      });
    }
  }

  private async continueExecutionFromStepInAnotherJob({
    lastExecutedStepId,
    workflowRunId,
    workspaceId,
  }: {
    lastExecutedStepId: string;
    workflowRunId: string;
    workspaceId: string;
  }) {
    await this.messageQueueService.add<RunWorkflowJobData>(
      RUN_WORKFLOW_JOB_NAME,
      {
        workspaceId,
        workflowRunId,
        lastExecutedStepId,
      },
      buildRunWorkflowJobOptions(workflowRunId),
    );
  }
}
