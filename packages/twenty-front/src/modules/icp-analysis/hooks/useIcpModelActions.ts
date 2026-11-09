import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import {
  type IcpCriterion,
  type IcpDatasetRow,
} from 'twenty-shared/icp-analysis';
import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';

import {
  ANALYZE_ICP_MODEL,
  DUPLICATE_ICP_MODEL,
  SUGGEST_ICP_MODEL_CRITERIA,
} from '@/icp-analysis/graphql/mutations/icpModelMutations';
import { ICP_MODEL_EVIDENCE } from '@/icp-analysis/graphql/queries/icpModelEvidence';
import { type IcpEvidence } from '@/icp-analysis/types/IcpEvidence';
import { type IcpModelAnalysisSnapshot } from '@/icp-analysis/types/IcpModelRecord';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useNavigateApp } from '~/hooks/useNavigateApp';

type AnalyzeIcpModelResult = {
  analyzeIcpModel: {
    modelId: string;
    analysis: IcpModelAnalysisSnapshot;
    rows: IcpDatasetRow[];
  };
};

type SuggestIcpModelCriteriaResult = {
  suggestIcpModelCriteria: { modelId: string; criteria: IcpCriterion[] };
};

type DuplicateIcpModelResult = {
  duplicateIcpModel: { modelId: string; version: number };
};

type IcpModelEvidenceResult = {
  icpModelEvidence: IcpEvidence & { modelId: string };
};

export const useIcpModelActions = () => {
  const { t } = useLingui();
  const apolloClient = useApolloClient();
  const navigate = useNavigateApp();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const runReportingErrors = async <TResult>(
    action: () => Promise<TResult>,
  ): Promise<TResult | null> => {
    try {
      return await action();
    } catch (error) {
      enqueueErrorSnackBar({
        ...(CombinedGraphQLErrors.is(error) ? { apolloError: error } : {}),
      });

      return null;
    }
  };

  const analyzeModel = (modelId: string) =>
    runReportingErrors(async () => {
      const { data } = await apolloClient.mutate<AnalyzeIcpModelResult>({
        mutation: ANALYZE_ICP_MODEL,
        variables: { input: { modelId } },
      });

      return data?.analyzeIcpModel ?? null;
    });

  const suggestCriteria = (modelId: string) =>
    runReportingErrors(async () => {
      const { data } = await apolloClient.mutate<SuggestIcpModelCriteriaResult>(
        {
          mutation: SUGGEST_ICP_MODEL_CRITERIA,
          variables: { input: { modelId } },
        },
      );

      return data?.suggestIcpModelCriteria.criteria ?? null;
    });

  const loadEvidence = (modelId: string) =>
    runReportingErrors(async () => {
      const { data } = await apolloClient.query<IcpModelEvidenceResult>({
        query: ICP_MODEL_EVIDENCE,
        variables: { input: { modelId } },
        fetchPolicy: 'network-only',
      });

      return data?.icpModelEvidence ?? null;
    });

  const duplicateModel = async (modelId: string) => {
    const duplicatedModel = await runReportingErrors(async () => {
      const { data } = await apolloClient.mutate<DuplicateIcpModelResult>({
        mutation: DUPLICATE_ICP_MODEL,
        variables: { input: { modelId } },
      });

      return data?.duplicateIcpModel ?? null;
    });

    if (duplicatedModel === null) {
      return;
    }

    enqueueSuccessSnackBar({
      message: t`Version ${duplicatedModel.version} created as a draft`,
    });

    navigate(AppPath.RecordShowPage, {
      objectNameSingular: CoreObjectNameSingular.IcpModel,
      objectRecordId: duplicatedModel.modelId,
    });
  };

  return { analyzeModel, suggestCriteria, loadEvidence, duplicateModel };
};
