export type DealMessageChannel = 'WHATSAPP' | 'EMAIL';

export type DealMessageDirection = 'INBOUND' | 'OUTBOUND';

export type DealMessage = {
  channel: DealMessageChannel;
  direction: DealMessageDirection;
  sentAt: string | null;
  senderName: string | null;
  subject: string | null;
  // Null when the mailbox owner shares only metadata or subjects for this email.
  body: string | null;
  isInternalNote: boolean;
};

export type DealCallSummary = {
  title: string | null;
  startedAt: string | null;
  summaryMarkdown: string;
};

export type DealTask = {
  title: string | null;
  status: string | null;
  dueAt: string | null;
};

export type DealNote = {
  title: string | null;
  createdAt: string | null;
  bodyMarkdown: string | null;
};

export type StageOption = {
  value: string;
  label: string;
};

export type DealContext = {
  // ISO timestamp of the run; the WhatsApp reply window is measured from it.
  now: string;
  today: string;
  opportunity: {
    id: string;
    name: string | null;
    stage: string | null;
    amountMicros: number | null;
    currencyCode: string | null;
    closeDate: string | null;
    createdAt: string | null;
  };
  stageOptions: StageOption[];
  ownerName: string | null;
  company: { name: string | null; domain: string | null } | null;
  pointOfContact: {
    name: string | null;
    jobTitle: string | null;
    email: string | null;
    hasPhone: boolean;
  } | null;
  messages: DealMessage[];
  callSummaries: DealCallSummary[];
  tasks: DealTask[];
  notes: DealNote[];
};
