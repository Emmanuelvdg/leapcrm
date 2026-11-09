import {
  bucketIcpNumericValues,
  type IcpAttributeDefinition,
  type IcpDatasetRow,
} from 'twenty-shared/icp-analysis';
import { isDefined } from 'twenty-shared/utils';

import { ICP_EVIDENCE_MAX_DEAL_COUNT } from 'src/modules/icp-analysis/constants/icp-evidence-limits.constant';
import { type IcpCatalogAttribute } from 'src/modules/icp-analysis/types/icp-catalog-attribute.type';
import {
  type IcpDealWindow,
  type IcpEvidence,
} from 'src/modules/icp-analysis/types/icp-evidence.type';
import { extractIcpAttributeValues } from 'src/modules/icp-analysis/utils/extract-icp-attribute-values.util';

export type IcpEvidenceOpportunity = {
  id: string;
  name?: string | null;
  stage: string;
  companyId: string | null;
  closeDate: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lostReason?: string | null;
};

const toDate = (value: Date | string): Date => new Date(value);

// A deal closes on its close date when one is set; otherwise its last update
// is the best record of when it reached a won or lost stage.
const getClosedAt = (opportunity: IcpEvidenceOpportunity): Date =>
  toDate(opportunity.closeDate ?? opportunity.updatedAt);

const isInWindow = (closedAt: Date, window: IcpDealWindow): boolean =>
  closedAt.getTime() >= Date.parse(window.start) &&
  (window.end === null || closedAt.getTime() <= Date.parse(window.end));

const attachNumericBands = (
  attributes: IcpCatalogAttribute[],
  rows: IcpDatasetRow[],
): IcpAttributeDefinition[] =>
  attributes.map(({ source: _source, ...attribute }) => {
    if (attribute.valueType !== 'NUMBER') {
      return attribute;
    }

    const values = rows.flatMap((row) => {
      const value = row.values[attribute.key];

      return typeof value === 'number' ? [value] : [];
    });

    return { ...attribute, bands: bucketIcpNumericValues({ values }) };
  });

export const buildIcpEvidenceRows = ({
  opportunities,
  companiesById,
  attributes,
  wonStages,
  window,
}: {
  opportunities: IcpEvidenceOpportunity[];
  companiesById: Map<string, Record<string, unknown>>;
  attributes: IcpCatalogAttribute[];
  wonStages: string[];
  window: IcpDealWindow;
}): IcpEvidence => {
  const closedOpportunities = opportunities
    .map((opportunity) => ({
      opportunity,
      closedAt: getClosedAt(opportunity),
    }))
    .filter(
      ({ closedAt }) =>
        !Number.isNaN(closedAt.getTime()) && isInWindow(closedAt, window),
    )
    .sort(
      (first, second) => second.closedAt.getTime() - first.closedAt.getTime(),
    );

  const keptOpportunities = closedOpportunities.slice(
    0,
    ICP_EVIDENCE_MAX_DEAL_COUNT,
  );

  const rows = keptOpportunities.flatMap(
    ({ opportunity, closedAt }): IcpDatasetRow[] => {
      const company = isDefined(opportunity.companyId)
        ? companiesById.get(opportunity.companyId)
        : undefined;

      if (!isDefined(company)) {
        return [];
      }

      return [
        {
          id: opportunity.id,
          name: opportunity.name ?? null,
          outcome: wonStages.includes(opportunity.stage) ? 'WON' : 'LOST',
          closedAt: closedAt.toISOString(),
          lostReason: opportunity.lostReason ?? null,
          values: extractIcpAttributeValues({
            record: company,
            attributes,
            referenceDate: toDate(opportunity.createdAt),
          }),
        },
      ];
    },
  );

  return {
    attributes: attachNumericBands(attributes, rows),
    rows,
    window,
    excludedWithoutCompanyCount: keptOpportunities.length - rows.length,
    isTruncated: closedOpportunities.length > keptOpportunities.length,
  };
};
