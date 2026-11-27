import { type CoreApiClient } from 'twenty-client-sdk/core';

import { fullName, nodesOf } from 'src/utils/quote-records';
import { decodeJwtClaims } from 'src/utils/security';

export type Caller = {
  workspaceMemberId: string;
  email: string | null;
  name: string;
};

type MemberNode = {
  id: string;
  userEmail: string | null;
  name: { firstName: string | null; lastName: string | null } | null;
};

// For a signed-in request the server mints this run's app token with the
// caller's user id, so it identifies who clicked Approve.
export const resolveCaller = async (
  client: CoreApiClient,
  userWorkspaceId: string | null | undefined,
): Promise<Caller | null> => {
  const claims = decodeJwtClaims(process.env.TWENTY_APP_ACCESS_TOKEN ?? '');

  if (
    !userWorkspaceId ||
    !claims.userId ||
    claims.userWorkspaceId !== userWorkspaceId
  ) {
    return null;
  }

  const { workspaceMembers } = await client.query({
    workspaceMembers: {
      __args: { filter: { userId: { eq: claims.userId } }, first: 1 },
      edges: {
        node: {
          id: true,
          userEmail: true,
          name: { firstName: true, lastName: true },
        },
      },
    },
  });

  const member = nodesOf(
    workspaceMembers as { edges: { node: MemberNode }[] },
  )[0];

  return member
    ? {
        workspaceMemberId: member.id,
        email: member.userEmail?.toLowerCase() ?? null,
        name: fullName(member.name) || member.userEmail || 'A teammate',
      }
    : null;
};

export const findMembersByEmail = async (
  client: CoreApiClient,
  emails: string[],
): Promise<{ id: string; email: string }[]> => {
  if (emails.length === 0) {
    return [];
  }

  const { workspaceMembers } = await client.query({
    workspaceMembers: {
      __args: { first: 200 },
      edges: { node: { id: true, userEmail: true } },
    },
  });

  return nodesOf(
    workspaceMembers as {
      edges: { node: { id: string; userEmail: string | null } }[];
    },
  )
    .filter((member) => emails.includes(member.userEmail?.toLowerCase() ?? ''))
    .map((member) => ({
      id: member.id,
      email: member.userEmail?.toLowerCase() ?? '',
    }));
};
