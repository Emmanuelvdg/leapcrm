import { describe, expect, it } from 'vitest';

import {
  getPhoneSearchFragment,
  parsePhoneInput,
  phonesMatch,
} from 'src/utils/phone-number';

describe('parsePhoneInput', () => {
  it('keeps international numbers for the server to parse', () => {
    expect(parsePhoneInput('+91 98765-43210', 'IN')).toEqual({
      internationalDigits: '919876543210',
      apiValue: { primaryPhoneNumber: '+919876543210' },
    });
    expect(parsePhoneInput('0044 20 7946 0958', 'IN')).toEqual({
      internationalDigits: '442079460958',
      apiValue: { primaryPhoneNumber: '+442079460958' },
    });
  });

  it('reads local numbers in the default country', () => {
    expect(parsePhoneInput('098765 43210', 'IN')).toEqual({
      internationalDigits: '919876543210',
      apiValue: {
        primaryPhoneNumber: '9876543210',
        primaryPhoneCountryCode: 'IN',
      },
    });
  });

  it('recognises a country code typed without "+"', () => {
    expect(parsePhoneInput('91 98765 43210', 'IN')?.apiValue).toEqual({
      primaryPhoneNumber: '+919876543210',
    });
  });

  it('refuses numbers that are too short', () => {
    expect(parsePhoneInput('12345', 'IN')).toBeUndefined();
  });
});

describe('phonesMatch', () => {
  it('matches the primary or an additional number', () => {
    expect(
      phonesMatch(
        {
          primaryPhoneNumber: '9876543210',
          primaryPhoneCallingCode: '+91',
          additionalPhones: null,
        },
        '919876543210',
      ),
    ).toBe(true);
    expect(
      phonesMatch(
        {
          primaryPhoneNumber: '1111111111',
          primaryPhoneCallingCode: '+91',
          additionalPhones: [{ number: '98765 43210', callingCode: '+91' }],
        },
        '919876543210',
      ),
    ).toBe(true);
  });

  it('does not match the same national number in another country', () => {
    expect(
      phonesMatch(
        {
          primaryPhoneNumber: '9876543210',
          primaryPhoneCallingCode: '+1',
          additionalPhones: null,
        },
        '919876543210',
      ),
    ).toBe(false);
  });

  it('matches a long national number saved without a calling code', () => {
    expect(
      phonesMatch(
        {
          primaryPhoneNumber: '9876543210',
          primaryPhoneCallingCode: '',
          additionalPhones: null,
        },
        '919876543210',
      ),
    ).toBe(true);
  });

  it('narrows the search to the last seven digits', () => {
    expect(getPhoneSearchFragment('919876543210')).toBe('6543210');
  });
});
