import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import {
  DEFAULT_ICP_TIER_THRESHOLDS,
  type IcpAttributePatterns,
  type IcpCriterion,
  type IcpPatternBucket,
  type IcpTierThresholds,
  runIcpBacktest,
} from 'twenty-shared/icp-analysis';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Tag, type TagColor } from 'twenty-ui/data-display';
import { IconCopy, IconPlayerPlay } from 'twenty-ui/icon';
import { Button, SegmentedControl } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { IcpBacktestSection } from '@/icp-analysis/components/IcpBacktestSection';
import { IcpEvidenceSection } from '@/icp-analysis/components/IcpEvidenceSection';
import { IcpModelSection } from '@/icp-analysis/components/IcpModelSection';
import { IcpPatternsSection } from '@/icp-analysis/components/IcpPatternsSection';
import { ICP_MODEL_RECORD_GQL_FIELDS } from '@/icp-analysis/constants/IcpModelRecordGqlFields';
import { useIcpModelActions } from '@/icp-analysis/hooks/useIcpModelActions';
import { type IcpAnalysisSection } from '@/icp-analysis/types/IcpAnalysisSection';
import { type IcpEvidence } from '@/icp-analysis/types/IcpEvidence';
import {
  type IcpModelRecord,
  type IcpModelStatus,
} from '@/icp-analysis/types/IcpModelRecord';
import { buildIcpCriterionFromBucket } from '@/icp-analysis/utils/buildIcpCriterionFromBucket';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';

const STATUS_TAG_COLORS: Record<IcpModelStatus, TagColor> = {
  DRAFT: 'gray',
  ACTIVE: 'green',
  ARCHIVED: 'gray',
};

const StyledContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[3]};
  width: 100%;
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledHeaderInfo = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledHeaderActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const NO_CRITERIA: IcpCriterion[] = [];

type PendingAction = 'analyze' | 'suggest' | 'save' | 'duplicate';

type IcpAnalysisWidgetProps = {
  widget: PageLayoutWidget;
};

export const IcpAnalysisWidget = ({
  widget: _widget,
}: IcpAnalysisWidgetProps) => {
  const { t } = useLingui();
  const targetRecord = useTargetRecord();
  const { enqueueErrorSnackBar } = useSnackBar();
  const { updateOneRecord } = useUpdateOneRecord();
  const { analyzeModel, suggestCriteria, loadEvidence, duplicateModel } =
    useIcpModelActions();

  const { record: model, refetch } = useFindOneRecord<IcpModelRecord>({
    objectNameSingular: CoreObjectNameSingular.IcpModel,
    objectRecordId: targetRecord.id,
    recordGqlFields: ICP_MODEL_RECORD_GQL_FIELDS,
  });

  const [section, setSection] = useState<IcpAnalysisSection>('EVIDENCE');
  const [evidence, setEvidence] = useState<IcpEvidence | null>(null);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [draftCriteria, setDraftCriteria] = useState<IcpCriterion[] | null>(
    null,
  );
  const [draftThresholds, setDraftThresholds] =
    useState<IcpTierThresholds | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  const criteria = draftCriteria ?? model?.criteria ?? NO_CRITERIA;
  const thresholds =
    draftThresholds ?? model?.tierThresholds ?? DEFAULT_ICP_TIER_THRESHOLDS;

  // Computed in the browser so every edit shows its effect on past deals
  // before anything is saved.
  const backtest = useMemo(
    () =>
      isDefined(evidence)
        ? runIcpBacktest({
            criteria,
            thresholds,
            rows: evidence.rows,
            attributes: evidence.attributes,
          })
        : null,
    [criteria, thresholds, evidence],
  );

  if (!isDefined(model)) {
    return null;
  }

  const hasAnalysis = isDefined(model.analysis);
  const isEditable = model.status === 'DRAFT';
  const isDirty = isDefined(draftCriteria) || isDefined(draftThresholds);

  const runPendingAction = async (
    action: PendingAction,
    callback: () => Promise<void>,
  ) => {
    setPendingAction(action);

    try {
      await callback();
    } finally {
      setPendingAction(null);
    }
  };

  const fetchEvidence = async () => {
    setIsLoadingEvidence(true);

    try {
      const loadedEvidence = await loadEvidence(model.id);

      if (isDefined(loadedEvidence)) {
        setEvidence({
          attributes: loadedEvidence.attributes,
          rows: loadedEvidence.rows,
        });
      }
    } finally {
      setIsLoadingEvidence(false);
    }
  };

  const handleSectionChange = (nextSection: IcpAnalysisSection) => {
    setSection(nextSection);

    const needsDeals = nextSection === 'MODEL' || nextSection === 'BACKTEST';

    if (
      needsDeals &&
      hasAnalysis &&
      !isDefined(evidence) &&
      !isLoadingEvidence
    ) {
      void fetchEvidence();
    }
  };

  const handleRunAnalysis = () =>
    runPendingAction('analyze', async () => {
      const result = await analyzeModel(model.id);

      if (isDefined(result)) {
        setEvidence({
          attributes: result.analysis.attributes,
          rows: result.rows,
        });
        await refetch();
      }
    });

  const handleSuggest = () =>
    runPendingAction('suggest', async () => {
      const suggestedCriteria = await suggestCriteria(model.id);

      if (isDefined(suggestedCriteria)) {
        setDraftCriteria(suggestedCriteria);
      }
    });

  const handleSave = () =>
    runPendingAction('save', async () => {
      try {
        await updateOneRecord({
          objectNameSingular: CoreObjectNameSingular.IcpModel,
          idToUpdate: model.id,
          updateOneRecordInput: { criteria, tierThresholds: thresholds },
        });
        setDraftCriteria(null);
        setDraftThresholds(null);
        await refetch();
      } catch (error) {
        enqueueErrorSnackBar({
          message: error instanceof Error ? error.message : undefined,
        });
      }
    });

  const handleDiscard = () => {
    setDraftCriteria(null);
    setDraftThresholds(null);
  };

  const handleAddBucket = (
    attribute: IcpAttributePatterns,
    bucket: IcpPatternBucket,
  ) =>
    setDraftCriteria([
      ...criteria,
      buildIcpCriterionFromBucket({ attribute, bucket }),
    ]);

  const statusLabels: Record<IcpModelStatus, string> = {
    DRAFT: t`Draft`,
    ACTIVE: t`Active`,
    ARCHIVED: t`Archived`,
  };

  return (
    <StyledContainer>
      <StyledHeader>
        <StyledHeaderInfo>
          <Tag
            color={STATUS_TAG_COLORS[model.status]}
            text={statusLabels[model.status]}
          />
          <span>{t`Version ${model.version}`}</span>
          {isDefined(model.analyzedAt) && (
            <span>
              {t`Analyzed ${new Date(model.analyzedAt).toLocaleDateString()}`}
            </span>
          )}
        </StyledHeaderInfo>
        <StyledHeaderActions>
          <Button
            Icon={IconPlayerPlay}
            size="small"
            variant={hasAnalysis ? 'secondary' : 'primary'}
            accent={hasAnalysis ? 'default' : 'blue'}
            title={t`Run analysis`}
            isLoading={pendingAction === 'analyze'}
            disabled={isDefined(pendingAction)}
            onClick={handleRunAnalysis}
          />
          <Button
            Icon={IconCopy}
            size="small"
            variant="secondary"
            title={t`Duplicate`}
            isLoading={pendingAction === 'duplicate'}
            disabled={isDefined(pendingAction)}
            onClick={() =>
              runPendingAction('duplicate', () => duplicateModel(model.id))
            }
          />
        </StyledHeaderActions>
      </StyledHeader>
      <SegmentedControl<IcpAnalysisSection>
        ariaLabel={t`ICP analysis section`}
        role="tablist"
        value={section}
        onChange={handleSectionChange}
        options={[
          { value: 'EVIDENCE', label: t`Evidence` },
          { value: 'PATTERNS', label: t`Patterns` },
          { value: 'MODEL', label: t`Model` },
          { value: 'BACKTEST', label: t`Back-test` },
        ]}
      />
      {section === 'EVIDENCE' && (
        <IcpEvidenceSection analysis={model.analysis} />
      )}
      {section === 'PATTERNS' && (
        <IcpPatternsSection
          analysis={model.analysis}
          addedBucketKeys={criteria.map(({ id }) => id)}
          onAddBucket={isEditable ? handleAddBucket : undefined}
        />
      )}
      {section === 'MODEL' && (
        <IcpModelSection
          criteria={criteria}
          thresholds={thresholds}
          isEditable={isEditable}
          isDirty={isDirty}
          hasAnalysis={hasAnalysis}
          backtest={backtest}
          isSuggesting={pendingAction === 'suggest'}
          isSaving={pendingAction === 'save'}
          onCriteriaChange={setDraftCriteria}
          onThresholdsChange={setDraftThresholds}
          onSuggest={handleSuggest}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
      )}
      {section === 'BACKTEST' && (
        <IcpBacktestSection backtest={backtest} hasAnalysis={hasAnalysis} />
      )}
    </StyledContainer>
  );
};
