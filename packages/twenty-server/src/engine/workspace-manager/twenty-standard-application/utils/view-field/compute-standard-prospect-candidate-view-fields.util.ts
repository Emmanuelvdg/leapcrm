import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardProspectCandidateViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'prospectCandidate'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allProspectCandidatesName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectCandidate',
      context: {
        viewName: 'allProspectCandidates',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 210,
      },
    }),
    allProspectCandidatesIndustry: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectCandidate',
      context: {
        viewName: 'allProspectCandidates',
        viewFieldName: 'industry',
        fieldName: 'industry',
        position: 1,
        isVisible: true,
        size: 170,
      },
    }),
    allProspectCandidatesCountry: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectCandidate',
      context: {
        viewName: 'allProspectCandidates',
        viewFieldName: 'country',
        fieldName: 'country',
        position: 2,
        isVisible: true,
        size: 110,
      },
    }),
    allProspectCandidatesEmployeeCount: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectCandidate',
      context: {
        viewName: 'allProspectCandidates',
        viewFieldName: 'employeeCount',
        fieldName: 'employeeCount',
        position: 3,
        isVisible: true,
        size: 120,
      },
    }),
    allProspectCandidatesDomain: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectCandidate',
      context: {
        viewName: 'allProspectCandidates',
        viewFieldName: 'domain',
        fieldName: 'domain',
        position: 4,
        isVisible: true,
        size: 170,
      },
    }),
    allProspectCandidatesMatchStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectCandidate',
      context: {
        viewName: 'allProspectCandidates',
        viewFieldName: 'matchStatus',
        fieldName: 'matchStatus',
        position: 5,
        isVisible: true,
        size: 150,
      },
    }),
    allProspectCandidatesLifecycleStage: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectCandidate',
      context: {
        viewName: 'allProspectCandidates',
        viewFieldName: 'lifecycleStage',
        fieldName: 'lifecycleStage',
        position: 6,
        isVisible: true,
        size: 150,
      },
    }),
    allProspectCandidatesMatchedCompany: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectCandidate',
      context: {
        viewName: 'allProspectCandidates',
        viewFieldName: 'matchedCompany',
        fieldName: 'matchedCompany',
        position: 7,
        isVisible: true,
        size: 170,
      },
    }),
    allProspectCandidatesCampaign: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectCandidate',
      context: {
        viewName: 'allProspectCandidates',
        viewFieldName: 'campaign',
        fieldName: 'campaign',
        position: 8,
        isVisible: true,
        size: 170,
      },
    }),
    allProspectCandidatesUpdatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectCandidate',
      context: {
        viewName: 'allProspectCandidates',
        viewFieldName: 'updatedAt',
        fieldName: 'updatedAt',
        position: 9,
        isVisible: true,
        size: 150,
      },
    }),
  };
};
