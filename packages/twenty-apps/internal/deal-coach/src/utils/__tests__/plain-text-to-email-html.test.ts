import { describe, expect, it } from 'vitest';

import { plainTextToEmailHtml } from 'src/utils/plain-text-to-email-html';

describe('plainTextToEmailHtml', () => {
  it('turns blank lines into paragraphs and newlines into line breaks', () => {
    expect(
      plainTextToEmailHtml(
        'Hi Priya,\n\nThe proposal is attached.\nParking is included.\n\nBest,\nMaya',
      ),
    ).toBe(
      '<p>Hi Priya,</p><p>The proposal is attached.<br>Parking is included.</p><p>Best,<br>Maya</p>',
    );
  });

  it('escapes HTML in the draft', () => {
    expect(plainTextToEmailHtml('Price < 2.5m & "final"')).toBe(
      '<p>Price &lt; 2.5m &amp; &quot;final&quot;</p>',
    );
  });

  it('returns an empty string for an empty draft', () => {
    expect(plainTextToEmailHtml('  \n\n ')).toBe('');
  });
});
