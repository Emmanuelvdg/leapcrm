import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { Tag } from 'twenty-ui/data-display';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type FieldMetadataItemOption } from '@/object-metadata/types/FieldMetadataItem';

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
`;

const StyledCount = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-variant-numeric: tabular-nums;
`;

const StyledEmpty = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
`;

export type ProspectingCountGroup = {
  groupByDimensionValues: (string | null)[];
  totalCount?: number;
};

type ProspectingCountListProps = {
  title: string;
  groups: ProspectingCountGroup[];
  options: FieldMetadataItemOption[];
};

export const ProspectingCountList = ({
  title,
  groups,
  options,
}: ProspectingCountListProps) => {
  const { t } = useLingui();

  // Listed in the field's option order so stages read as a pipeline.
  const rows = options
    .map((option) => ({
      option,
      count:
        groups.find(
          ({ groupByDimensionValues }) =>
            groupByDimensionValues[0] === option.value,
        )?.totalCount ?? 0,
    }))
    .filter(({ count }) => count > 0);

  const unsetCount =
    groups.find(
      ({ groupByDimensionValues }) => !isDefined(groupByDimensionValues[0]),
    )?.totalCount ?? 0;

  return (
    <StyledList>
      <StyledTitle>{title}</StyledTitle>
      {rows.length === 0 && unsetCount === 0 && (
        <StyledEmpty>{t`No candidates yet`}</StyledEmpty>
      )}
      {rows.map(({ option, count }) => (
        <StyledRow key={option.value}>
          <Tag color={option.color} text={option.label} />
          <StyledCount>{count}</StyledCount>
        </StyledRow>
      ))}
      {unsetCount > 0 && (
        <StyledRow>
          <Tag color="gray" text={t`Not set`} />
          <StyledCount>{unsetCount}</StyledCount>
        </StyledRow>
      )}
    </StyledList>
  );
};
