import { useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { EMPTY_QUERY } from '@/object-record/constants/EmptyQuery';
import { type RecordGqlOperationGroupByResult } from '@/object-record/graphql/types/RecordGqlOperationGroupByResult';
import { generateGroupByAggregateQuery } from '@/object-record/record-aggregate/utils/generateGroupByAggregateQuery';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { getGroupByQueryResultGqlFieldName } from '@/page-layout/utils/getGroupByQueryResultGqlFieldName';
import { ProspectingCountList } from '@/prospecting/widgets/ProspectingCountList';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const RUNNING_CAMPAIGN_POLL_INTERVAL_MS = 5000;

const StyledContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[3]};
  width: 100%;
`;

const StyledProgressHeader = styled.div`
  align-items: baseline;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  justify-content: space-between;
`;

const StyledProgressCaption = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.regular};
`;

const StyledProgressTrack = styled.div`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.pill};
  height: 6px;
  overflow: hidden;
  width: 100%;
`;

const StyledProgressFill = styled.div<{ percent: number }>`
  background: ${themeCssVariables.color.blue};
  height: 100%;
  width: ${({ percent }) => `${percent}%`};
`;

const StyledBreakdowns = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

type ProspectingDiscoveryStatusWidgetProps = {
  widget: PageLayoutWidget;
};

export const ProspectingDiscoveryStatusWidget = ({
  widget: _widget,
}: ProspectingDiscoveryStatusWidgetProps) => {
  const { t } = useLingui();
  const targetRecord = useTargetRecord();
  const apolloCoreClient = useApolloCoreClient();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const recordStore = useAtomFamilyStateValue(
    recordStoreFamilyState,
    targetRecord.id,
  );

  const candidateObjectMetadataItem = objectMetadataItems.find(
    ({ nameSingular }) =>
      nameSingular === CoreObjectNameSingular.ProspectCandidate,
  );

  const groupByQuery = useMemo(
    () =>
      isDefined(candidateObjectMetadataItem)
        ? generateGroupByAggregateQuery({
            objectMetadataItem: candidateObjectMetadataItem,
            aggregateOperationGqlFields: ['totalCount'],
          })
        : null,
    [candidateObjectMetadataItem],
  );

  const isRunning = recordStore?.status === 'RUNNING';
  const queryOptions = {
    client: apolloCoreClient,
    skip: !isDefined(groupByQuery),
    pollInterval: isRunning ? RUNNING_CAMPAIGN_POLL_INTERVAL_MS : 0,
  };
  const campaignFilter = { campaignId: { eq: targetRecord.id } };

  const { data: lifecycleStageData } =
    useQuery<RecordGqlOperationGroupByResult>(groupByQuery ?? EMPTY_QUERY, {
      ...queryOptions,
      variables: {
        filter: campaignFilter,
        groupBy: [{ lifecycleStage: true }],
      },
    });

  const { data: matchStatusData } = useQuery<RecordGqlOperationGroupByResult>(
    groupByQuery ?? EMPTY_QUERY,
    {
      ...queryOptions,
      variables: {
        filter: campaignFilter,
        groupBy: [{ matchStatus: true }],
      },
    },
  );

  if (!isDefined(candidateObjectMetadataItem)) {
    return null;
  }

  const groupByFieldName = getGroupByQueryResultGqlFieldName(
    candidateObjectMetadataItem,
  );
  const candidatesFound = Number(recordStore?.candidatesFound ?? 0);
  const targetCandidateCount = Number(recordStore?.targetCandidateCount ?? 0);
  const progressPercent =
    targetCandidateCount > 0
      ? Math.min(
          100,
          Math.round((candidatesFound / targetCandidateCount) * 100),
        )
      : 0;

  const findSelectOptions = (fieldName: string) =>
    candidateObjectMetadataItem.fields.find(({ name }) => name === fieldName)
      ?.options ?? [];

  return (
    <StyledContainer>
      <div>
        <StyledProgressHeader>
          <span>
            {targetCandidateCount > 0
              ? t`${candidatesFound} of ${targetCandidateCount} candidates found`
              : t`${candidatesFound} candidates found`}
          </span>
          {isRunning && (
            <StyledProgressCaption>{t`Discovering…`}</StyledProgressCaption>
          )}
        </StyledProgressHeader>
        <StyledProgressTrack>
          <StyledProgressFill percent={progressPercent} />
        </StyledProgressTrack>
      </div>
      <StyledBreakdowns>
        <ProspectingCountList
          title={t`By stage`}
          groups={lifecycleStageData?.[groupByFieldName] ?? []}
          options={findSelectOptions('lifecycleStage')}
        />
        <ProspectingCountList
          title={t`By CRM match`}
          groups={matchStatusData?.[groupByFieldName] ?? []}
          options={findSelectOptions('matchStatus')}
        />
      </StyledBreakdowns>
    </StyledContainer>
  );
};
