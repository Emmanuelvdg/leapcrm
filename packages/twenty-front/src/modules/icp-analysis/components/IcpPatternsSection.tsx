import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import {
  type IcpAttributePatterns,
  type IcpPatternBucket,
} from 'twenty-shared/icp-analysis';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { IcpPatternTable } from '@/icp-analysis/components/IcpPatternTable';
import {
  StyledIcpEmpty,
  StyledIcpSectionTitle,
} from '@/icp-analysis/components/IcpStat';
import { type IcpModelAnalysisSnapshot } from '@/icp-analysis/types/IcpModelRecord';

const StyledSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
`;

const StyledAttribute = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const hasSignal = ({ buckets }: IcpAttributePatterns) =>
  buckets.some(
    ({ direction, isLowSample }) => !isLowSample && direction !== 'NEUTRAL',
  );

type IcpPatternsSectionProps = {
  analysis: IcpModelAnalysisSnapshot | null;
  addedBucketKeys: string[];
  onAddBucket?: (
    attribute: IcpAttributePatterns,
    bucket: IcpPatternBucket,
  ) => void;
};

export const IcpPatternsSection = ({
  analysis,
  addedBucketKeys,
  onAddBucket,
}: IcpPatternsSectionProps) => {
  const { t } = useLingui();

  if (!isDefined(analysis)) {
    return (
      <StyledIcpEmpty>{t`Run the analysis to see patterns.`}</StyledIcpEmpty>
    );
  }

  const attributesWithBuckets = analysis.patterns.attributes
    .filter(({ buckets }) => buckets.length > 0)
    .sort(
      (first, second) => Number(hasSignal(second)) - Number(hasSignal(first)),
    );

  if (attributesWithBuckets.length === 0) {
    return (
      <StyledIcpEmpty>
        {t`None of the analyzed company fields have values on these deals yet.`}
      </StyledIcpEmpty>
    );
  }

  return (
    <StyledSection>
      {attributesWithBuckets.map((attribute) => (
        <StyledAttribute key={attribute.attributeKey}>
          <StyledIcpSectionTitle>{attribute.label}</StyledIcpSectionTitle>
          <IcpPatternTable
            buckets={attribute.buckets}
            baselineWinRate={analysis.patterns.baselineWinRate}
            addedBucketKeys={addedBucketKeys}
            onAddBucket={
              isDefined(onAddBucket)
                ? (bucket) => onAddBucket(attribute, bucket)
                : undefined
            }
          />
        </StyledAttribute>
      ))}
    </StyledSection>
  );
};
