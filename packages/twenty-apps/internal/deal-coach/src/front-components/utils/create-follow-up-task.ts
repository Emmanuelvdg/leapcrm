import { CoreApiClient } from 'twenty-client-sdk/core';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import { type NextBestActionRecord } from 'src/front-components/hooks/use-next-best-action';

const buildTaskBody = (record: NextBestActionRecord): string =>
  [
    record.nextBestActionReason,
    record.nextBestActionDraft
      ? `Suggested message:\n\n${record.nextBestActionDraft}`
      : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join('\n\n');

export const createFollowUpTask = async (
  record: NextBestActionRecord,
): Promise<void> => {
  if (!record.nextBestAction) {
    return;
  }

  try {
    const client = new CoreApiClient();

    const { createTask } = await client.mutation({
      createTask: {
        __args: {
          data: {
            title: record.nextBestAction,
            status: 'TODO',
            dueAt: record.nextBestActionDueDate
              ? `${record.nextBestActionDueDate}T09:00:00.000Z`
              : null,
            assigneeId: record.ownerId,
            bodyV2: { markdown: buildTaskBody(record) },
          },
        },
        id: true,
      },
    });

    const taskId = (createTask as { id: string } | null)?.id;

    if (!taskId) {
      throw new Error('Task was not created');
    }

    await client.mutation({
      createTaskTarget: {
        __args: {
          data: { taskId, targetOpportunityId: record.id },
        },
        id: true,
      },
    });

    await enqueueSnackbar({
      message: 'Task created on this deal.',
      variant: 'success',
    });
  } catch {
    await enqueueSnackbar({
      message: 'Could not create the task.',
      variant: 'error',
    });
  }
};
