export type MatchKind =
  | 'NAME'
  | 'DOMAIN'
  | 'EMAIL'
  | 'LINKEDIN'
  | 'NAME_AT_COMPANY';

export type MatchKey = { kind: MatchKind; value: string };

export type DuplicateCandidate = {
  id: string;
  createdAt: string;
  keys: MatchKey[];
};

export type DuplicateMembership = {
  // The oldest record of the group; the others point at it.
  primaryId: string;
  otherIds: string[];
  matchKinds: MatchKind[];
};

const MATCH_KIND_ORDER: MatchKind[] = [
  'EMAIL',
  'DOMAIN',
  'LINKEDIN',
  'NAME_AT_COMPANY',
  'NAME',
];

const compareByAge = (
  first: DuplicateCandidate,
  second: DuplicateCandidate,
): number =>
  first.createdAt === second.createdAt
    ? first.id.localeCompare(second.id)
    : first.createdAt.localeCompare(second.createdAt);

export const findDuplicateGroups = (
  candidates: DuplicateCandidate[],
): Map<string, DuplicateMembership> => {
  const parentById = new Map<string, string>(
    candidates.map((candidate) => [candidate.id, candidate.id]),
  );

  const findRoot = (id: string): string => {
    let root = id;

    while (parentById.get(root) !== root) {
      root = parentById.get(root) as string;
    }

    parentById.set(id, root);

    return root;
  };

  const idsByKey = new Map<string, string[]>();

  for (const candidate of candidates) {
    for (const { kind, value } of candidate.keys) {
      const keyId = `${kind}:${value}`;
      const ids = idsByKey.get(keyId) ?? [];

      if (ids.includes(candidate.id)) {
        continue;
      }

      if (ids.length > 0) {
        parentById.set(findRoot(candidate.id), findRoot(ids[0]));
      }

      idsByKey.set(keyId, [...ids, candidate.id]);
    }
  }

  const membersByRoot = new Map<string, DuplicateCandidate[]>();

  for (const candidate of candidates) {
    const root = findRoot(candidate.id);

    membersByRoot.set(root, [...(membersByRoot.get(root) ?? []), candidate]);
  }

  const membershipById = new Map<string, DuplicateMembership>();

  for (const members of membersByRoot.values()) {
    if (members.length < 2) {
      continue;
    }

    const [primary] = [...members].sort(compareByAge);

    for (const member of members) {
      const sharedKinds = new Set(
        member.keys
          .filter(
            ({ kind, value }) =>
              (idsByKey.get(`${kind}:${value}`)?.length ?? 0) > 1,
          )
          .map(({ kind }) => kind),
      );

      membershipById.set(member.id, {
        primaryId: primary.id,
        otherIds: members
          .filter((other) => other.id !== member.id)
          .map((other) => other.id),
        matchKinds: MATCH_KIND_ORDER.filter((kind) => sharedKinds.has(kind)),
      });
    }
  }

  return membershipById;
};
