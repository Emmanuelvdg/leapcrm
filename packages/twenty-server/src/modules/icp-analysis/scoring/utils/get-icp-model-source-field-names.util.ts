import { type IcpCriterion } from 'twenty-shared/icp-analysis';

import { type IcpCatalogAttribute } from 'src/modules/icp-analysis/types/icp-catalog-attribute.type';

export const getIcpModelSourceFieldNames = ({
  criteria,
  attributes,
}: {
  criteria: IcpCriterion[];
  attributes: IcpCatalogAttribute[];
}): Set<string> => {
  const usedAttributeKeys = new Set(
    criteria.map(({ attributeKey }) => attributeKey),
  );

  return new Set(
    attributes
      .filter(({ key }) => usedAttributeKeys.has(key))
      .map(({ source }) => source.fieldName),
  );
};
