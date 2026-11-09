import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardIcpModelViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'icpModel'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allIcpModelsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'icpModel',
      context: {
        viewName: 'allIcpModels',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 210,
      },
    }),
    allIcpModelsStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'icpModel',
      context: {
        viewName: 'allIcpModels',
        viewFieldName: 'status',
        fieldName: 'status',
        position: 1,
        isVisible: true,
        size: 130,
      },
    }),
    allIcpModelsVersion: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'icpModel',
      context: {
        viewName: 'allIcpModels',
        viewFieldName: 'version',
        fieldName: 'version',
        position: 2,
        isVisible: true,
        size: 100,
      },
    }),
    allIcpModelsAnalyzedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'icpModel',
      context: {
        viewName: 'allIcpModels',
        viewFieldName: 'analyzedAt',
        fieldName: 'analyzedAt',
        position: 3,
        isVisible: true,
        size: 150,
      },
    }),
    allIcpModelsActivatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'icpModel',
      context: {
        viewName: 'allIcpModels',
        viewFieldName: 'activatedAt',
        fieldName: 'activatedAt',
        position: 4,
        isVisible: true,
        size: 150,
      },
    }),
    allIcpModelsCreatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'icpModel',
      context: {
        viewName: 'allIcpModels',
        viewFieldName: 'createdBy',
        fieldName: 'createdBy',
        position: 5,
        isVisible: true,
        size: 150,
      },
    }),
    allIcpModelsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'icpModel',
      context: {
        viewName: 'allIcpModels',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 6,
        isVisible: true,
        size: 150,
      },
    }),
  };
};
