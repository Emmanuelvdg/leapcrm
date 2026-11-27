import { describe, expect, it } from 'vitest';

import { DEFAULT_FORM_FIELDS } from 'src/constants/form-field-options';
import { parseFormFields } from 'src/utils/parse-form-fields';
import { parseSubmission } from 'src/utils/parse-submission';

const parse = (
  body: Record<string, unknown>,
  query: Record<string, string | undefined> = {},
) =>
  parseSubmission({
    fields: DEFAULT_FORM_FIELDS,
    body,
    query,
    referrerHeader: 'https://acme.example/contact',
  });

describe('parseSubmission', () => {
  it('reads answers, source tags and the spam markers', () => {
    const parsed = parse({
      full_name: '  Priya Shah ',
      phone: '+91 98765 43210',
      message: 'Looking for a 2BHK',
      utm_source: 'google',
      utm_campaign: 'diwali',
      _lc_t: '1795000000000',
    });

    expect(parsed.errors).toEqual({});
    expect(parsed.answers).toEqual({
      full_name: 'Priya Shah',
      phone: '+91 98765 43210',
      message: 'Looking for a 2BHK',
    });
    expect(parsed.meta).toEqual(
      expect.objectContaining({
        utmSource: 'google',
        utmCampaign: 'diwali',
        utmMedium: null,
        pageUrl: 'https://acme.example/contact',
      }),
    );
    expect(parsed.isHoneypotFilled).toBe(false);
    expect(parsed.renderedAtMs).toBe(1_795_000_000_000);
  });

  it('takes source tags from the query string when the body has none', () => {
    expect(
      parse({ full_name: 'A', phone: '9876543210' }, { utm_medium: 'cpc' }).meta
        .utmMedium,
    ).toBe('cpc');
  });

  it('flags missing required answers and bad formats', () => {
    expect(parse({ email: 'not-an-email', phone: '12' }).errors).toEqual({
      full_name: 'Full name is required.',
      email: 'Please enter a valid email address.',
      phone: 'Please enter a valid phone number.',
    });
  });

  it('requires an email or a phone number', () => {
    const fields = parseFormFields([
      { label: 'Name', key: 'name', mapsTo: 'person.fullName' },
      { label: 'Email', key: 'email', type: 'email' },
      { label: 'Phone', key: 'phone', type: 'phone' },
    ]);

    expect(
      parseSubmission({
        fields,
        body: { name: 'Priya' },
        query: {},
        referrerHeader: null,
      }).errors,
    ).toEqual({
      email: 'Please give an email address or phone number.',
      phone: 'Please give an email address or phone number.',
    });
  });

  it('rejects a drop-down value that is not an option', () => {
    const fields = parseFormFields([
      { label: 'Phone', key: 'phone', type: 'phone', required: true },
      {
        label: 'Budget',
        key: 'budget',
        type: 'select',
        options: ['Low', 'High'],
      },
    ]);

    expect(
      parseSubmission({
        fields,
        body: { phone: '9876543210', budget: 'Medium' },
        query: {},
        referrerHeader: null,
      }).errors,
    ).toEqual({ budget: 'Please choose one of the options.' });
  });

  it('notices a filled honeypot', () => {
    expect(
      parse({
        full_name: 'Bot',
        phone: '9876543210',
        _lc_website: 'spam.example',
      }).isHoneypotFilled,
    ).toBe(true);
  });
});
