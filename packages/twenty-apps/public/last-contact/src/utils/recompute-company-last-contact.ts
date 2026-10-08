import { type CoreApiClient } from 'twenty-client-sdk/core';

import {
  CONTACT_ITEM_RELATIONS_SELECTION,
  type ContactItemRelations,
  readContactItemColumns,
} from 'src/utils/contact-item-columns';

type PersonNode = ContactItemRelations & {
  lastContactAt?: string | null;
};

// A company's last contact mirrors the most recent contact of any of its people,
// so it must be recomputed whenever that set of people changes rather than only
// when an interaction happens.
export const recomputeCompanyLastContact = async (
  client: CoreApiClient,
  companyId: string,
): Promise<void> => {
  const { people } = await client.query({
    people: {
      __args: {
        filter: {
          companyId: { eq: companyId },
          lastContactAt: { is: 'NOT_NULL' },
        },
        orderBy: [{ lastContactAt: 'DescNullsLast' }],
        first: 1,
      },
      edges: {
        node: {
          lastContactAt: true,
          ...CONTACT_ITEM_RELATIONS_SELECTION,
        },
      },
    },
  });

  const topPerson = (people?.edges?.[0]?.node as PersonNode | undefined) ?? {};

  await client.mutation({
    updateCompany: {
      __args: {
        id: companyId,
        data: {
          lastContactAt: topPerson.lastContactAt ?? null,
          ...readContactItemColumns(topPerson),
        },
      },
      id: true,
    },
  });
};
