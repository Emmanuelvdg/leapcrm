import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useApolloClient } from '@apollo/client/react';
import { t } from '@lingui/core/macro';
import { CoreObjectNameSingular, FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { useUpsertRecordsInStore } from '@/object-record/record-store/hooks/useUpsertRecordsInStore';
import { useBuildSpreadsheetImportFields } from '@/object-record/spreadsheet-import/hooks/useBuildSpreadSheetImportFields';
import { PROSPECT_CANDIDATE_IMPORT_FIELD_NAMES } from '@/prospecting/constants/ProspectCandidateImportFieldNames';
import { PROSPECT_CANDIDATE_IMPORT_MAX_ROWS } from '@/prospecting/constants/ProspectCandidateImportMaxRows';
import { IMPORT_PROSPECT_CANDIDATES } from '@/prospecting/graphql/mutations/importProspectCandidates';
import { buildProspectCompanyImportRow } from '@/prospecting/utils/buildProspectCompanyImportRow';
import { useOpenSpreadsheetImportDialog } from '@/spreadsheet-import/hooks/useOpenSpreadsheetImportDialog';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { type ImportProspectCandidatesMutation } from '~/generated-metadata/graphql';

// The import goes through the prospecting mutation, not record creation, so
// rows are deduplicated and matched against the CRM like discovered ones.
export const useOpenProspectCandidatesImportDialog = () => {
  const apolloClient = useApolloClient();
  const apolloCoreClient = useApolloCoreClient();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const { openSpreadsheetImportDialog } = useOpenSpreadsheetImportDialog();
  const { buildSpreadsheetImportFields } = useBuildSpreadsheetImportFields();
  const { upsertRecordsInStore } = useUpsertRecordsInStore();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const openProspectCandidatesImportDialog = ({
    campaignId,
  }: {
    campaignId: string;
  }) => {
    const candidateObjectMetadataItem = objectMetadataItems.find(
      ({ nameSingular }) =>
        nameSingular === CoreObjectNameSingular.ProspectCandidate,
    );

    if (!isDefined(candidateObjectMetadataItem)) {
      enqueueErrorSnackBar({ message: t`Prospect candidates are not set up` });

      return;
    }

    // Domain is a links field; importing it as plain text keeps one column
    // per company and lets the server normalise it.
    const importFieldMetadataItems: FieldMetadataItem[] =
      PROSPECT_CANDIDATE_IMPORT_FIELD_NAMES.map((fieldName) =>
        candidateObjectMetadataItem.fields.find(
          ({ name }) => name === fieldName,
        ),
      )
        .filter(isDefined)
        .map((fieldMetadataItem) =>
          fieldMetadataItem.type === FieldMetadataType.LINKS
            ? { ...fieldMetadataItem, type: FieldMetadataType.TEXT }
            : fieldMetadataItem,
        );

    const spreadsheetImportFields = buildSpreadsheetImportFields(
      importFieldMetadataItems,
    ).map((spreadsheetImportField) =>
      spreadsheetImportField.key === 'name'
        ? {
            ...spreadsheetImportField,
            fieldValidationDefinitions: [
              {
                rule: 'required' as const,
                errorMessage: t`A company name is required`,
                level: 'error' as const,
              },
            ],
          }
        : spreadsheetImportField,
    );

    openSpreadsheetImportDialog({
      spreadsheetImportFields,
      availableFieldMetadataItems: importFieldMetadataItems,
      maxRecords: PROSPECT_CANDIDATE_IMPORT_MAX_ROWS,
      onSubmit: async ({ validStructuredRows }) => {
        const companies = validStructuredRows
          .map(buildProspectCompanyImportRow)
          .filter(isDefined);

        if (companies.length === 0) {
          enqueueErrorSnackBar({
            message: t`No rows with a company name to import`,
          });

          return;
        }

        try {
          const { data } =
            await apolloClient.mutate<ImportProspectCandidatesMutation>({
              mutation: IMPORT_PROSPECT_CANDIDATES,
              variables: { input: { campaignId, companies } },
            });

          const importResult = data?.importProspectCandidates;

          if (!isDefined(importResult)) {
            return;
          }

          upsertRecordsInStore({
            partialRecords: [
              {
                __typename: 'ProspectingCampaign',
                id: campaignId,
                candidatesFound: importResult.candidatesFound,
              },
            ],
          });

          await apolloCoreClient.refetchQueries({
            updateCache: (cache) => {
              cache.evict({ fieldName: 'prospectCandidates' });
            },
          });

          const { createdCount, mergedCount } = importResult;

          enqueueSuccessSnackBar({
            message: t`Imported ${createdCount} new companies and merged ${mergedCount} into existing candidates`,
          });
        } catch (error) {
          enqueueErrorSnackBar({
            ...(CombinedGraphQLErrors.is(error) ? { apolloError: error } : {}),
          });
        }
      },
    });
  };

  return { openProspectCandidatesImportDialog };
};
