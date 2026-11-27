import { describe, expect, it } from 'vitest';

import { getWhatsappReplyWindow } from 'src/utils/get-whatsapp-reply-window';

const NOW = '2026-11-24T12:00:00.000Z';

describe('getWhatsappReplyWindow', () => {
  it('is open for 24 hours after the contact’s last message', () => {
    expect(
      getWhatsappReplyWindow({
        lastInboundAt: '2026-11-24T09:30:00.000Z',
        now: NOW,
      }),
    ).toEqual({
      state: 'OPEN',
      closesAt: '2026-11-25T09:30:00.000Z',
      hoursLeft: 21,
    });
  });

  it('is closed once 24 hours have passed', () => {
    expect(
      getWhatsappReplyWindow({
        lastInboundAt: '2026-11-23T11:00:00.000Z',
        now: NOW,
      }),
    ).toEqual({ state: 'CLOSED', closedAt: '2026-11-24T11:00:00.000Z' });
  });

  it('was never opened when the contact has not written', () => {
    expect(getWhatsappReplyWindow({ lastInboundAt: null, now: NOW })).toEqual({
      state: 'NEVER_OPENED',
    });
  });
});
