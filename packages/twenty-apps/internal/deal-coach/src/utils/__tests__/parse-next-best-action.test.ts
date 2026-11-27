import { describe, expect, it } from 'vitest';

import {
  parseNextBestAction,
  type ParseNextBestActionContext,
} from 'src/utils/parse-next-best-action';

const CONTEXT: ParseNextBestActionContext = {
  today: '2026-11-24',
  stageOptions: [
    { value: 'NEW', label: 'New' },
    { value: 'MEETING', label: 'Meeting' },
    { value: 'PROPOSAL', label: 'Proposal' },
  ],
  currentStage: 'NEW',
  currentCloseDate: '2026-12-15',
  currentAmountMicros: 2_500_000_000_000,
};

const replyOutput = {
  actionType: 'REPLY',
  channel: 'WHATSAPP',
  nextAction: 'Confirm Thursday 11 AM site visit with Priya',
  reason: 'Priya asked about Thursday in her last WhatsApp and is waiting.',
  dueDate: '2026-11-25',
  risk: 'LOW',
  draftMessage: 'Hi Priya, Thursday 11 AM works. See you at the site!',
  emailSubject: '',
  meetingTitle: '',
  meetingStart: '',
  meetingDurationMinutes: 0,
  meetingLocation: '',
  newStage: '',
  newCloseDate: '',
  newAmount: 0,
};

describe('parseNextBestAction', () => {
  it('keeps a valid reply as is, with no details', () => {
    expect(parseNextBestAction(replyOutput, CONTEXT)).toEqual({
      actionType: 'REPLY',
      channel: 'WHATSAPP',
      nextAction: replyOutput.nextAction,
      reason: replyOutput.reason,
      dueDate: '2026-11-25',
      risk: 'LOW',
      draftMessage: replyOutput.draftMessage,
      details: { emailSubject: null, meeting: null, dealUpdate: null },
    });
  });

  it('returns undefined when there is no next action', () => {
    expect(
      parseNextBestAction({ ...replyOutput, nextAction: '  ' }, CONTEXT),
    ).toBeUndefined();
    expect(parseNextBestAction(null, CONTEXT)).toBeUndefined();
    expect(parseNextBestAction('text', CONTEXT)).toBeUndefined();
  });

  it('accepts lower-case enum values and falls back on unknown ones', () => {
    const parsed = parseNextBestAction(
      { ...replyOutput, channel: 'email', risk: 'high' },
      CONTEXT,
    );

    expect(parsed?.channel).toBe('EMAIL');
    expect(parsed?.risk).toBe('HIGH');
    expect(
      parseNextBestAction({ ...replyOutput, risk: 'unclear' }, CONTEXT)?.risk,
    ).toBe('MEDIUM');
  });

  it('infers the action type when the agent leaves it out', () => {
    expect(
      parseNextBestAction({ ...replyOutput, actionType: '' }, CONTEXT)
        ?.actionType,
    ).toBe('REPLY');
    expect(
      parseNextBestAction(
        { ...replyOutput, actionType: '', channel: 'NONE' },
        CONTEXT,
      )?.actionType,
    ).toBe('TASK');
  });

  it('drops the channel for calls and tasks, and the draft for tasks', () => {
    const call = parseNextBestAction(
      {
        ...replyOutput,
        actionType: 'CALL',
        draftMessage: '- Ask about budget\n- Confirm timeline',
      },
      CONTEXT,
    );

    expect(call?.channel).toBeNull();
    expect(call?.draftMessage).toBe('- Ask about budget\n- Confirm timeline');

    const task = parseNextBestAction(
      { ...replyOutput, actionType: 'TASK' },
      CONTEXT,
    );

    expect(task?.channel).toBeNull();
    expect(task?.draftMessage).toBeNull();
  });

  it('keeps the email subject only for email, and lifts a subject line out of the draft', () => {
    expect(
      parseNextBestAction(
        { ...replyOutput, channel: 'EMAIL', emailSubject: 'Final proposal' },
        CONTEXT,
      )?.details.emailSubject,
    ).toBe('Final proposal');
    expect(
      parseNextBestAction(
        { ...replyOutput, emailSubject: 'Final proposal' },
        CONTEXT,
      )?.details.emailSubject,
    ).toBeNull();

    const lifted = parseNextBestAction(
      {
        ...replyOutput,
        channel: 'EMAIL',
        draftMessage: 'Subject: Lease proposal\n\nHi Priya,\nAttached.',
      },
      CONTEXT,
    );

    expect(lifted?.details.emailSubject).toBe('Lease proposal');
    expect(lifted?.draftMessage).toBe('Hi Priya,\nAttached.');
  });

  it('moves past or invalid due dates to today', () => {
    expect(
      parseNextBestAction({ ...replyOutput, dueDate: '2026-11-01' }, CONTEXT)
        ?.dueDate,
    ).toBe('2026-11-24');
    expect(
      parseNextBestAction({ ...replyOutput, dueDate: 'next week' }, CONTEXT)
        ?.dueDate,
    ).toBe('2026-11-24');
  });

  describe('meetings', () => {
    const meetingOutput = {
      ...replyOutput,
      actionType: 'SCHEDULE_MEETING',
      meetingTitle: 'Site visit with Priya',
      meetingStart: '2026-11-26T11:00',
      meetingDurationMinutes: 60,
      meetingLocation: 'Globex office, 2nd floor',
    };

    it('keeps a valid proposed meeting', () => {
      expect(
        parseNextBestAction(meetingOutput, CONTEXT)?.details.meeting,
      ).toEqual({
        title: 'Site visit with Priya',
        startLocal: '2026-11-26T11:00',
        durationMinutes: 60,
        location: 'Globex office, 2nd floor',
      });
    });

    it('defaults a missing title and an out-of-range duration', () => {
      const meeting = parseNextBestAction(
        { ...meetingOutput, meetingTitle: '', meetingDurationMinutes: 0 },
        CONTEXT,
      )?.details.meeting;

      expect(meeting?.title).toBe(replyOutput.nextAction);
      expect(meeting?.durationMinutes).toBe(30);
    });

    it('drops meetings in the past or without a usable time', () => {
      expect(
        parseNextBestAction(
          { ...meetingOutput, meetingStart: '2026-11-20T11:00' },
          CONTEXT,
        )?.details.meeting,
      ).toBeNull();
      expect(
        parseNextBestAction(
          { ...meetingOutput, meetingStart: 'Thursday morning' },
          CONTEXT,
        )?.details.meeting,
      ).toBeNull();
    });

    it('ignores meeting fields on other action types', () => {
      expect(
        parseNextBestAction({ ...meetingOutput, actionType: 'REPLY' }, CONTEXT)
          ?.details.meeting,
      ).toBeNull();
    });
  });

  describe('deal updates', () => {
    it('keeps changes the record can hold', () => {
      expect(
        parseNextBestAction(
          {
            ...replyOutput,
            newStage: 'meeting',
            newCloseDate: '2027-01-15',
            newAmount: 2_600_000,
          },
          CONTEXT,
        )?.details.dealUpdate,
      ).toEqual({
        stage: 'MEETING',
        stageLabel: 'Meeting',
        closeDate: '2027-01-15',
        amountMicros: 2_600_000_000_000,
      });
    });

    it('drops unknown stages, unchanged values and past close dates', () => {
      expect(
        parseNextBestAction(
          {
            ...replyOutput,
            newStage: 'NEGOTIATION',
            newCloseDate: '2026-11-01',
            newAmount: 2_500_000,
          },
          CONTEXT,
        )?.details.dealUpdate,
      ).toBeNull();
      expect(
        parseNextBestAction({ ...replyOutput, newStage: 'NEW' }, CONTEXT)
          ?.details.dealUpdate,
      ).toBeNull();
    });
  });
});
