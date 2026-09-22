import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardConversationViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'conversation'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    allConversationsSubject: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'conversation',
      context: {
        viewName: 'allConversations',
        viewFieldName: 'subject',
        fieldName: 'subject',
        position: 0,
        isVisible: true,
        size: 200,
      },
    }),
    allConversationsChannelType: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'conversation',
      context: {
        viewName: 'allConversations',
        viewFieldName: 'channelType',
        fieldName: 'channelType',
        position: 1,
        isVisible: true,
        size: 150,
      },
    }),
    allConversationsStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'conversation',
      context: {
        viewName: 'allConversations',
        viewFieldName: 'status',
        fieldName: 'status',
        position: 2,
        isVisible: true,
        size: 150,
      },
    }),
    allConversationsPerson: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'conversation',
      context: {
        viewName: 'allConversations',
        viewFieldName: 'person',
        fieldName: 'person',
        position: 3,
        isVisible: true,
        size: 150,
      },
    }),
    allConversationsCompany: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'conversation',
      context: {
        viewName: 'allConversations',
        viewFieldName: 'company',
        fieldName: 'company',
        position: 4,
        isVisible: true,
        size: 150,
      },
    }),
    allConversationsAssignedTo: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'conversation',
      context: {
        viewName: 'allConversations',
        viewFieldName: 'assignedTo',
        fieldName: 'assignedTo',
        position: 5,
        isVisible: true,
        size: 150,
      },
    }),
    allConversationsLastMessageAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'conversation',
      context: {
        viewName: 'allConversations',
        viewFieldName: 'lastMessageAt',
        fieldName: 'lastMessageAt',
        position: 6,
        isVisible: true,
        size: 150,
      },
    }),
    allConversationsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'conversation',
      context: {
        viewName: 'allConversations',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 7,
        isVisible: true,
        size: 150,
      },
    }),
  };
};
