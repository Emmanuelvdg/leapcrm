import { describe, expect, it } from 'vitest';

import {
  type EmailMessageNode,
  mapEmailMessage,
} from 'src/utils/map-email-message';

const buildEmail = (
  overrides: Partial<EmailMessageNode> = {},
): EmailMessageNode => ({
  id: 'message-1',
  subject: 'Lease terms',
  text: 'Can we lower the deposit?',
  receivedAt: '2026-11-23T10:00:00.000Z',
  participants: [
    {
      role: 'from',
      displayName: 'Priya Shah',
      handle: 'priya@example.com',
      personId: 'person-1',
      workspaceMemberId: null,
    },
    {
      role: 'to',
      displayName: 'Maya R',
      handle: 'maya@ourcompany.com',
      personId: null,
      workspaceMemberId: 'member-1',
    },
  ],
  ...overrides,
});

const RESTRICTED = 'FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED';

describe('mapEmailMessage', () => {
  it('maps an email from the contact as inbound with its content', () => {
    expect(mapEmailMessage(buildEmail())).toEqual({
      channel: 'EMAIL',
      direction: 'INBOUND',
      sentAt: '2026-11-23T10:00:00.000Z',
      senderName: 'Priya Shah',
      subject: 'Lease terms',
      body: 'Can we lower the deposit?',
      isInternalNote: false,
    });
  });

  it('marks an email sent by a workspace member as outbound', () => {
    const email = buildEmail({
      participants: [
        {
          role: 'from',
          displayName: 'Maya R',
          handle: 'maya@ourcompany.com',
          personId: null,
          workspaceMemberId: 'member-1',
        },
      ],
    });

    expect(mapEmailMessage(email).direction).toBe('OUTBOUND');
  });

  it('drops the body the server hid for a subject-only mailbox', () => {
    const mapped = mapEmailMessage(buildEmail({ text: RESTRICTED }));

    expect(mapped.subject).toBe('Lease terms');
    expect(mapped.body).toBeNull();
  });

  it('drops subject and body the server hid for a metadata-only mailbox', () => {
    const mapped = mapEmailMessage(
      buildEmail({ subject: RESTRICTED, text: RESTRICTED }),
    );

    expect(mapped.subject).toBeNull();
    expect(mapped.body).toBeNull();
  });
});
