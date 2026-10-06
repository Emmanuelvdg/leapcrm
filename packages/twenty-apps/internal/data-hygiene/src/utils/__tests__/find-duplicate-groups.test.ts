import { describe, expect, it } from 'vitest';

import {
  type DuplicateCandidate,
  findDuplicateGroups,
} from 'src/utils/find-duplicate-groups';

const candidate = (
  id: string,
  createdAt: string,
  keys: DuplicateCandidate['keys'],
): DuplicateCandidate => ({ id, createdAt, keys });

describe('findDuplicateGroups', () => {
  it('groups records sharing any key and picks the oldest as primary', () => {
    const memberships = findDuplicateGroups([
      candidate('new', '2026-03-01', [{ kind: 'NAME', value: 'acme' }]),
      candidate('old', '2026-01-01', [
        { kind: 'NAME', value: 'acme' },
        { kind: 'DOMAIN', value: 'acme.com' },
      ]),
      candidate('other', '2026-02-01', [{ kind: 'NAME', value: 'globex' }]),
    ]);

    expect(memberships.get('new')).toEqual({
      primaryId: 'old',
      otherIds: ['old'],
      matchKinds: ['NAME'],
    });
    expect(memberships.get('old')?.primaryId).toBe('old');
    expect(memberships.has('other')).toBe(false);
  });

  it('chains matches through a shared record', () => {
    const memberships = findDuplicateGroups([
      candidate('a', '2026-01-01', [{ kind: 'NAME', value: 'acme' }]),
      candidate('b', '2026-01-02', [
        { kind: 'NAME', value: 'acme' },
        { kind: 'DOMAIN', value: 'acme.com' },
      ]),
      candidate('c', '2026-01-03', [{ kind: 'DOMAIN', value: 'acme.com' }]),
    ]);

    expect(memberships.get('c')).toEqual({
      primaryId: 'a',
      otherIds: ['a', 'b'],
      matchKinds: ['DOMAIN'],
    });
    expect(memberships.get('b')?.matchKinds).toEqual(['DOMAIN', 'NAME']);
  });

  it('does not match a record with itself when it repeats a key', () => {
    const memberships = findDuplicateGroups([
      candidate('a', '2026-01-01', [
        { kind: 'EMAIL', value: 'jane@acme.com' },
        { kind: 'EMAIL', value: 'jane@acme.com' },
      ]),
    ]);

    expect(memberships.size).toBe(0);
  });
});
