import { describe, expect, it } from 'vitest';

import { DEFAULT_FORM_FIELDS } from 'src/constants/form-field-options';
import {
  hasContactField,
  parseFormFields,
  toFieldKey,
  toStoredFormFields,
} from 'src/utils/parse-form-fields';

describe('parseFormFields', () => {
  it('keeps well-formed fields, stored as an object or a bare list', () => {
    expect(parseFormFields(toStoredFormFields(DEFAULT_FORM_FIELDS))).toEqual(
      DEFAULT_FORM_FIELDS,
    );
    expect(parseFormFields(DEFAULT_FORM_FIELDS)).toEqual(DEFAULT_FORM_FIELDS);
  });

  it('derives keys from labels and default targets from types', () => {
    expect(
      parseFormFields([
        { label: 'Work Email', type: 'email' },
        { label: 'Budget (₹ lakh)', type: 'text' },
      ]),
    ).toEqual([
      expect.objectContaining({
        key: 'work_email',
        type: 'email',
        mapsTo: 'person.email',
        required: false,
      }),
      expect.objectContaining({ key: 'budget_lakh', mapsTo: 'note' }),
    ]);
  });

  it('drops malformed, duplicate and reserved fields', () => {
    expect(
      parseFormFields([
        null,
        'text',
        { label: '' },
        { label: 'Email', key: 'email' },
        { label: 'Email again', key: 'email' },
        { label: 'Source', key: 'utm_source' },
        { label: 'Page', key: 'page_url' },
      ]).map((field) => field.key),
    ).toEqual(['email']);
  });

  it('never produces the hidden spam-check names', () => {
    expect(
      parseFormFields([{ label: 'Trap', key: '_lc_website' }])[0].key,
    ).toBe('lc_website');
    expect(parseFormFields('not an array')).toEqual([]);
  });

  it('turns a drop-down without options into a text field', () => {
    expect(
      parseFormFields([
        { label: 'Budget', type: 'select', options: [' ', ''] },
      ])[0].type,
    ).toBe('text');
    expect(
      parseFormFields([
        {
          label: 'Budget',
          type: 'select',
          options: ['< 50L', '50L+', '< 50L'],
        },
      ])[0].options,
    ).toEqual(['< 50L', '50L+']);
  });

  it('builds safe keys', () => {
    expect(toFieldKey('  2nd Phone Number! ')).toBe('field_2nd_phone_number');
  });

  it('knows whether a form can reach the contact', () => {
    expect(hasContactField(DEFAULT_FORM_FIELDS)).toBe(true);
    expect(
      hasContactField(
        parseFormFields([{ label: 'Message', type: 'textarea' }]),
      ),
    ).toBe(false);
  });
});
