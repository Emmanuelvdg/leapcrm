import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardProspectingCampaignViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'prospectingCampaign'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allProspectingCampaignsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectingCampaign',
      context: {
        viewName: 'allProspectingCampaigns',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 210,
      },
    }),
    allProspectingCampaignsStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectingCampaign',
      context: {
        viewName: 'allProspectingCampaigns',
        viewFieldName: 'status',
        fieldName: 'status',
        position: 1,
        isVisible: true,
        size: 130,
      },
    }),
    allProspectingCampaignsCandidatesFound: createStandardViewFieldFlatMetadata(
      {
        ...args,
        objectName: 'prospectingCampaign',
        context: {
          viewName: 'allProspectingCampaigns',
          viewFieldName: 'candidatesFound',
          fieldName: 'candidatesFound',
          position: 2,
          isVisible: true,
          size: 150,
        },
      },
    ),
    allProspectingCampaignsTargetCandidateCount:
      createStandardViewFieldFlatMetadata({
        ...args,
        objectName: 'prospectingCampaign',
        context: {
          viewName: 'allProspectingCampaigns',
          viewFieldName: 'targetCandidateCount',
          fieldName: 'targetCandidateCount',
          position: 3,
          isVisible: true,
          size: 140,
        },
      }),
    allProspectingCampaignsLastRunAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectingCampaign',
      context: {
        viewName: 'allProspectingCampaigns',
        viewFieldName: 'lastRunAt',
        fieldName: 'lastRunAt',
        position: 4,
        isVisible: true,
        size: 150,
      },
    }),
    allProspectingCampaignsCreatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectingCampaign',
      context: {
        viewName: 'allProspectingCampaigns',
        viewFieldName: 'createdBy',
        fieldName: 'createdBy',
        position: 5,
        isVisible: true,
        size: 150,
      },
    }),
    allProspectingCampaignsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'prospectingCampaign',
      context: {
        viewName: 'allProspectingCampaigns',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 6,
        isVisible: true,
        size: 150,
      },
    }),
  };
};
