import { isDefined } from 'twenty-shared/utils';
import { TRIGGER_STEP_ID, WorkflowActionType } from 'twenty-shared/workflow';

import {
  WorkflowVersionStepException,
  WorkflowVersionStepExceptionCode,
} from 'src/modules/workflow/common/exceptions/workflow-version-step.exception';
import { type WorkflowStepConnectionOptions } from 'src/modules/workflow/workflow-builder/workflow-version-step/types/WorkflowStepCreationOptions';
import { isWorkflowEmptyAction } from 'src/modules/workflow/workflow-executor/workflow-actions/empty/guards/is-workflow-empty-action.guard';
import { type WorkflowIteratorActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/iterator/types/workflow-iterator-action-settings.type';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { type WorkflowTrigger } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

export const insertStep = ({
  existingSteps,
  existingTrigger,
  insertedStep,
  nextStepId,
  parentStepId,
  parentStepConnectionOptions,
}: {
  existingSteps: WorkflowAction[];
  existingTrigger: WorkflowTrigger | null;
  insertedStep: WorkflowAction;
  nextStepId?: string;
  parentStepId?: string;
  parentStepConnectionOptions?: WorkflowStepConnectionOptions;
}): {
  updatedSteps: WorkflowAction[];
  updatedInsertedStep: WorkflowAction;
  updatedTrigger: WorkflowTrigger | null;
} => {
  let { updatedSteps, updatedTrigger } = isDefined(parentStepId)
    ? updateParentStep({
        trigger: existingTrigger,
        steps: existingSteps,
        parentStepId,
        insertedStepId: insertedStep.id,
        nextStepId,
        parentStepConnectionOptions,
      })
    : {
        updatedSteps: existingSteps,
        updatedTrigger: existingTrigger,
      };

  const updatedInsertedStep = {
    ...insertedStep,
    nextStepIds: nextStepId ? [nextStepId] : undefined,
  };

  return {
    updatedSteps: [...updatedSteps, updatedInsertedStep],
    updatedTrigger,
    updatedInsertedStep,
  };
};

const updateParentStep = ({
  steps,
  trigger,
  parentStepId,
  insertedStepId,
  nextStepId,
  parentStepConnectionOptions,
}: {
  steps: WorkflowAction[];
  trigger: WorkflowTrigger | null;
  parentStepId: string;
  insertedStepId: string;
  nextStepId?: string;
  parentStepConnectionOptions?: WorkflowStepConnectionOptions;
}): {
  updatedSteps: WorkflowAction[];
  updatedTrigger: WorkflowTrigger | null;
} => {
  if (isDefined(parentStepConnectionOptions)) {
    return updateStepsWithOptions({
      steps,
      parentStepId,
      insertedStepId,
      parentStepConnectionOptions,
      trigger,
      nextStepId,
    });
  } else {
    return updateParentStepNextStepIds({
      steps,
      trigger,
      parentStepId,
      insertedStepId,
      nextStepId,
    });
  }
};

const updateParentStepNextStepIds = ({
  steps,
  trigger,
  parentStepId,
  insertedStepId,
  nextStepId,
}: {
  steps: WorkflowAction[];
  trigger: WorkflowTrigger | null;
  parentStepId: string;
  insertedStepId: string;
  nextStepId?: string;
}): {
  updatedSteps: WorkflowAction[];
  updatedTrigger: WorkflowTrigger | null;
} => {
  let updatedTrigger = trigger;

  let updatedSteps = steps;

  if (parentStepId === TRIGGER_STEP_ID) {
    if (!trigger) {
      throw new WorkflowVersionStepException(
        'Cannot insert step from undefined trigger',
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
      );
    }

    updatedTrigger = {
      ...trigger,
      nextStepIds: [
        ...new Set([
          ...(trigger.nextStepIds?.filter((id) => id !== nextStepId) || []),
          insertedStepId,
        ]),
      ],
    };
  } else {
    updatedSteps = steps.map((step) => {
      if (step.id === parentStepId) {
        return {
          ...step,
          nextStepIds: [
            ...new Set([
              ...(step.nextStepIds?.filter((id) => id !== nextStepId) || []),
              insertedStepId,
            ]),
          ],
        };
      }

      return step;
    });
  }

  return {
    updatedSteps,
    updatedTrigger,
  };
};

const updateStepsWithOptions = ({
  parentStepId,
  insertedStepId,
  steps,
  parentStepConnectionOptions,
  trigger,
  nextStepId,
}: {
  parentStepId: string;
  insertedStepId: string;
  steps: WorkflowAction[];
  parentStepConnectionOptions: WorkflowStepConnectionOptions;
  trigger: WorkflowTrigger | null;
  nextStepId?: string;
}) => {
  let updatedSteps = steps;

  switch (parentStepConnectionOptions.connectedStepType) {
    case WorkflowActionType.ITERATOR: {
      if (!parentStepConnectionOptions.settings.isConnectedToLoop) {
        break;
      }

      const parentIteratorStep = steps.find(
        (step) => step.id === parentStepId,
      );

      if (isDefined(parentIteratorStep)) {
        if (parentIteratorStep.type !== WorkflowActionType.ITERATOR) {
          throw new WorkflowVersionStepException(
            `Step ${parentIteratorStep.id} is not an iterator`,
            WorkflowVersionStepExceptionCode.INVALID_REQUEST,
          );
        }

        const previousLoopStepIds =
          parentIteratorStep.settings.input.initialLoopStepIds ?? [];

        // A freshly-created iterator gets an auto-generated "Add an Action"
        // placeholder as its loop body, wired with nextStepIds back to the
        // iterator so an untouched loop still closes (see
        // createEmptyNodeForIteratorStep). That placeholder is scaffolding,
        // not user content, so it never belongs alongside a real step being
        // attached to the loop here — drop it the same way the explicit
        // nextStepId is dropped below.
        const isDisplacedEmptyPlaceholder = (id: string) => {
          const candidateStep = steps.find((step) => step.id === id);

          return (
            isDefined(candidateStep) && isWorkflowEmptyAction(candidateStep)
          );
        };

        const newLoopStepIds = [
          ...new Set([
            ...previousLoopStepIds.filter(
              (id: string) =>
                id !== nextStepId && !isDisplacedEmptyPlaceholder(id),
            ),
            insertedStepId,
          ]),
        ];

        const updatedIteratorStep = {
          ...parentIteratorStep,
          settings: {
            ...parentIteratorStep.settings,
            input: {
              ...parentIteratorStep.settings.input,
              initialLoopStepIds: newLoopStepIds,
            },
          } satisfies WorkflowIteratorActionSettings,
        };

        // If the placeholder was dropped from initialLoopStepIds above, it
        // would otherwise keep existing in `steps` with its back-edge to the
        // iterator intact — making it a permanent "parent" of the iterator
        // that never runs and never completes, which blocks the iterator
        // from executing forever (see should-execute-child-step.util.ts).
        // Delete it here rather than leave it as a dangling step.
        const displacedEmptyStepIds = previousLoopStepIds.filter(
          (id: string) =>
            !newLoopStepIds.includes(id) && isDisplacedEmptyPlaceholder(id),
        );

        updatedSteps = steps
          .filter((step) => !displacedEmptyStepIds.includes(step.id))
          .map((step) =>
            step.id === parentStepId ? updatedIteratorStep : step,
          );
      }

      break;
    }
    default:
      break;
  }

  return {
    updatedSteps,
    updatedTrigger: trigger,
  };
};
