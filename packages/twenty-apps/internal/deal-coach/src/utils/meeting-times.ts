import { type MeetingProposal } from 'src/utils/next-best-action-details.type';

// The agent gives a wall-clock time; it is read in the rep's own time zone,
// which is the zone the conversation's "Thursday 11 AM" was agreed in.
export const getMeetingBoundaries = (
  meeting: MeetingProposal,
): { startsAt: string; endsAt: string } | undefined => {
  const startMs = new Date(meeting.startLocal).getTime();

  if (Number.isNaN(startMs)) {
    return undefined;
  }

  return {
    startsAt: new Date(startMs).toISOString(),
    endsAt: new Date(
      startMs + meeting.durationMinutes * 60 * 1000,
    ).toISOString(),
  };
};

export const formatMeetingStart = (meeting: MeetingProposal): string => {
  const start = new Date(meeting.startLocal);

  if (Number.isNaN(start.getTime())) {
    return meeting.startLocal;
  }

  return start.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};
