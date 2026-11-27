import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import {
  enqueueSnackbar,
  openCommandConfirmationModal,
} from 'twenty-sdk/front-component';

import { type NextBestActionRecord } from 'src/front-components/hooks/use-next-best-action';
import { findConnectedAccount } from 'src/front-components/utils/find-connected-account';
import {
  formatMeetingStart,
  getMeetingBoundaries,
} from 'src/utils/meeting-times';

const getBrowserTimeZone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

export const createMeetingEvent = async (
  record: NextBestActionRecord,
): Promise<void> => {
  const meeting = record.nextBestActionDetails?.meeting;
  const boundaries = meeting ? getMeetingBoundaries(meeting) : undefined;

  if (!meeting || !boundaries) {
    return;
  }

  const contactEmail = record.contact?.email ?? null;
  const confirmation = await openCommandConfirmationModal({
    title: 'Create calendar event?',
    subtitle: `"${meeting.title}" on ${formatMeetingStart(meeting)} for ${meeting.durationMinutes} minutes${meeting.location ? ` at ${meeting.location}` : ''}. ${
      contactEmail
        ? `Your calendar will email an invitation to ${contactEmail}.`
        : 'The contact has no email address, so no invitation will be sent.'
    }`,
    confirmButtonText: 'Create event',
    confirmButtonAccent: 'blue',
  });

  if (confirmation !== 'confirm') {
    return;
  }

  try {
    const connectedAccount = await findConnectedAccount();

    if (!connectedAccount) {
      await enqueueSnackbar({
        message:
          'Connect your calendar in Settings > Accounts to create events from the CRM.',
        variant: 'info',
      });

      return;
    }

    const { createCalendarEvent } = await new MetadataApiClient().mutation({
      createCalendarEvent: {
        __args: {
          input: {
            connectedAccountId: connectedAccount.id,
            title: meeting.title,
            description: record.nextBestActionDraft ?? undefined,
            location: meeting.location ?? undefined,
            startsAt: boundaries.startsAt,
            endsAt: boundaries.endsAt,
            timeZone: getBrowserTimeZone(),
            attendees: contactEmail ?? undefined,
            sendInvitations: contactEmail !== null,
          },
        },
        success: true,
        error: true,
      },
    });

    const result = createCalendarEvent as {
      success: boolean;
      error?: string | null;
    } | null;

    await enqueueSnackbar(
      result?.success
        ? { message: 'Calendar event created.', variant: 'success' }
        : {
            message: `Could not create the event${result?.error ? `: ${result.error}` : '.'}`,
            variant: 'error',
          },
    );
  } catch {
    await enqueueSnackbar({
      message: 'Could not create the calendar event.',
      variant: 'error',
    });
  }
};
