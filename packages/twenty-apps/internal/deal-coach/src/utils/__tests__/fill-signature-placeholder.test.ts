import { describe, expect, it } from 'vitest';

import { fillSignaturePlaceholder } from 'src/utils/fill-signature-placeholder';

describe('fillSignaturePlaceholder', () => {
  it('replaces a signature placeholder with the owner’s first name', () => {
    expect(
      fillSignaturePlaceholder(
        'Hi Priya,\n\nBest regards,\n[Your Name]',
        'Maya Rao',
      ),
    ).toBe('Hi Priya,\n\nBest regards,\nMaya');
    expect(fillSignaturePlaceholder('Thanks, [Sender Name]', 'Maya Rao')).toBe(
      'Thanks, Maya',
    );
  });

  it('removes the placeholder when the deal has no owner', () => {
    expect(fillSignaturePlaceholder('Best regards,\n[Your Name]', null)).toBe(
      'Best regards,',
    );
  });

  it('leaves drafts without placeholders unchanged', () => {
    expect(
      fillSignaturePlaceholder('Hi Priya, see you Thursday!', 'Maya'),
    ).toBe('Hi Priya, see you Thursday!');
    expect(fillSignaturePlaceholder(null, 'Maya')).toBeNull();
  });
});
