import { describe, expect, it } from 'vitest';

import { buildDealCoachPrompt } from 'src/utils/build-deal-coach-prompt';
import {
  type DealContext,
  type DealMessage,
} from 'src/utils/deal-context.type';

const buildContext = (overrides: Partial<DealContext> = {}): DealContext => ({
  now: '2026-11-24T12:00:00.000Z',
  today: '2026-11-24',
  stageOptions: [
    { value: 'NEW', label: 'New' },
    { value: 'MEETING', label: 'Meeting' },
  ],
  opportunity: {
    id: 'opportunity-1',
    name: 'Hartwell office lease',
    stage: 'MEETING',
    amountMicros: 480_000_000_000,
    currencyCode: 'USD',
    closeDate: '2026-12-15',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  ownerName: 'Maya R',
  company: { name: 'Hartwell & Co.', domain: 'https://hartwell.example' },
  pointOfContact: {
    name: 'Priya Shah',
    jobTitle: 'COO',
    email: 'priya@globex.example',
    hasPhone: true,
  },
  messages: [],
  callSummaries: [],
  tasks: [],
  notes: [],
  ...overrides,
});

const buildMessage = (overrides: Partial<DealMessage> = {}): DealMessage => ({
  channel: 'WHATSAPP',
  direction: 'INBOUND',
  sentAt: '2026-11-23T09:00:00.000Z',
  senderName: 'Priya Shah',
  subject: null,
  body: 'Can we tour the space Thursday?',
  isInternalNote: false,
  ...overrides,
});

describe('buildDealCoachPrompt', () => {
  it('describes the deal, its people and today’s date', () => {
    const prompt = buildDealCoachPrompt(buildContext());

    expect(prompt).toContain("Today's date: 2026-11-24 (Tuesday)");
    expect(prompt).toContain('- Name: Hartwell office lease');
    expect(prompt).toContain('- Stage: MEETING (Meeting)');
    expect(prompt).toContain(
      '- Open stage values: NEW (New), MEETING (Meeting)',
    );
    expect(prompt).toContain('- Contact email: priya@globex.example');
    expect(prompt).toContain('- Contact phone: on file');
    expect(prompt).toContain('- Amount: 480,000 USD');
    expect(prompt).toContain('- Deal owner: Maya R');
    expect(prompt).toContain('- Point of contact: Priya Shah, COO');
    expect(prompt).toContain('No WhatsApp messages or emails recorded');
  });

  it('lists messages oldest first with who sent them', () => {
    const prompt = buildDealCoachPrompt(
      buildContext({
        messages: [
          buildMessage({ sentAt: '2026-11-23T09:00:00.000Z' }),
          buildMessage({
            direction: 'OUTBOUND',
            senderName: 'Maya R',
            sentAt: '2026-11-20T09:00:00.000Z',
            body: 'Here are three options.',
          }),
        ],
      }),
    );

    const outboundIndex = prompt.indexOf('Here are three options.');
    const inboundIndex = prompt.indexOf('Can we tour the space Thursday?');

    expect(outboundIndex).toBeGreaterThan(-1);
    expect(outboundIndex).toBeLessThan(inboundIndex);
    expect(prompt).toContain('WhatsApp from Us (Maya R)');
    expect(prompt).toContain('WhatsApp from Contact (Priya Shah)');
    expect(prompt).toContain(
      '- Last message from the contact: 2026-11-23 09:00 (1 day ago)',
    );
    expect(prompt).toContain(
      '- Last message from us: 2026-11-20 09:00 (4 days ago)',
    );
  });

  it('says whether the WhatsApp reply window is open', () => {
    expect(
      buildDealCoachPrompt(
        buildContext({
          messages: [buildMessage({ sentAt: '2026-11-24T09:00:00.000Z' })],
        }),
      ),
    ).toContain(
      '- WhatsApp reply window: open, closes 2026-11-25 09:00 UTC (in about 21 hours)',
    );
    expect(
      buildDealCoachPrompt(
        buildContext({
          messages: [buildMessage({ sentAt: '2026-11-20T09:00:00.000Z' })],
        }),
      ),
    ).toContain(
      '- WhatsApp reply window: closed since 2026-11-21 09:00 UTC, free-text WhatsApp messages cannot be sent',
    );
    expect(buildDealCoachPrompt(buildContext())).toContain(
      '- WhatsApp reply window: the contact has never written on WhatsApp',
    );
  });

  it('tells the agent not to change stages it does not know', () => {
    expect(buildDealCoachPrompt(buildContext({ stageOptions: [] }))).toContain(
      '- Open stage values: unknown, do not suggest a stage change',
    );
  });

  it('says when an email’s content is not shared', () => {
    const prompt = buildDealCoachPrompt(
      buildContext({
        messages: [
          buildMessage({ channel: 'EMAIL', subject: null, body: null }),
        ],
      }),
    );

    expect(prompt).toContain('(content not shared)');
  });

  it('includes tasks, call summaries and notes', () => {
    const prompt = buildDealCoachPrompt(
      buildContext({
        tasks: [
          { title: 'Send lease comparison', status: 'TODO', dueAt: null },
        ],
        callSummaries: [
          {
            title: 'Discovery call',
            startedAt: '2026-11-21T15:00:00.000Z',
            summaryMarkdown: 'Budget confirmed, board sign-off due Friday.',
          },
        ],
        notes: [
          {
            title: 'Parking',
            createdAt: '2026-11-22T10:00:00.000Z',
            bodyMarkdown: 'Needs 20 parking spots.',
          },
        ],
      }),
    );

    expect(prompt).toContain('- Send lease comparison (status: TODO');
    expect(prompt).toContain('Budget confirmed, board sign-off due Friday.');
    expect(prompt).toContain('Parking: Needs 20 parking spots.');
  });

  it('drops the oldest messages when the history is too long', () => {
    const messages = Array.from({ length: 60 }, (_, index) =>
      buildMessage({
        sentAt: new Date(Date.UTC(2026, 9, 1 + index)).toISOString(),
        body: `Message number ${index} ${'x'.repeat(900)}`,
      }),
    );

    const prompt = buildDealCoachPrompt(buildContext({ messages }));

    expect(prompt.length).toBeLessThanOrEqual(26_000);
    expect(prompt).toContain('Message number 59');
    expect(prompt).not.toContain('Message number 0 ');
    expect(prompt).toContain('older messages left out');
  });
});
