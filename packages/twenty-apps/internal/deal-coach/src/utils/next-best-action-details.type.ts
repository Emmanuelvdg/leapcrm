export type MeetingProposal = {
  title: string;
  // Wall-clock time as the agent understood it (YYYY-MM-DDTHH:mm); the widget
  // reads it in the rep's own time zone when it creates the calendar event.
  startLocal: string;
  durationMinutes: number;
  location: string | null;
};

export type DealUpdateProposal = {
  stage: string | null;
  stageLabel: string | null;
  closeDate: string | null;
  amountMicros: number | null;
};

export type NextBestActionDetails = {
  emailSubject: string | null;
  meeting: MeetingProposal | null;
  dealUpdate: DealUpdateProposal | null;
};
