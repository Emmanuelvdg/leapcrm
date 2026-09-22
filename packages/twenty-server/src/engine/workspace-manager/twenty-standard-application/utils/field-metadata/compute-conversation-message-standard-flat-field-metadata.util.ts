import { msg } from '@lingui/core/macro';
import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';
import {
  DateDisplayFormat,
  FieldMetadataType,
  RelationOnDeleteAction,
  RelationType,
} from 'twenty-shared/types';

import { STANDARD_RELATION_FIELD_PROPERTIES_BY_RELATION_OBJECT } from 'src/engine/metadata-modules/object-metadata/constants/standard-relation-field-properties.constant';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type AllStandardObjectFieldName } from 'src/engine/workspace-manager/twenty-standard-application/types/all-standard-object-field-name.type';
import {
  type CreateStandardFieldArgs,
  createStandardFieldFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/create-standard-field-flat-metadata.util';
import { createStandardRelationFieldFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/create-standard-relation-field-flat-metadata.util';
export const buildConversationMessageStandardFlatFieldMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  twentyStandardApplicationId,
}: Omit<
  CreateStandardFieldArgs<'conversationMessage', FieldMetadataType>,
  'context'
>): Record<
  AllStandardObjectFieldName<'conversationMessage'>,
  FlatFieldMetadata
> => ({
  id: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'id',
      type: FieldMetadataType.UUID,
      label: i18nLabel(msg({ message: `Id`, context: 'fieldMetadata.label' })),
      description: i18nLabel(
        msg({ message: `Id`, context: 'fieldMetadata.description' }),
      ),
      icon: 'Icon123',
      isSystem: true,
      isNullable: false,
      isUIEditable: false,
      defaultValue: 'uuid',
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  createdAt: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'createdAt',
      type: FieldMetadataType.DATE_TIME,
      label: i18nLabel(
        msg({ message: `Creation date`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({ message: `Creation date`, context: 'fieldMetadata.description' }),
      ),
      icon: 'IconCalendar',
      isSystem: true,
      isNullable: false,
      isUIEditable: false,
      defaultValue: 'now',
      settings: { displayFormat: DateDisplayFormat.RELATIVE },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  updatedAt: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'updatedAt',
      type: FieldMetadataType.DATE_TIME,
      label: i18nLabel(
        msg({ message: `Last update`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Last time the record was changed`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCalendarClock',
      isSystem: true,
      isNullable: false,
      isUIEditable: false,
      defaultValue: 'now',
      settings: { displayFormat: DateDisplayFormat.RELATIVE },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  deletedAt: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'deletedAt',
      type: FieldMetadataType.DATE_TIME,
      label: i18nLabel(
        msg({ message: `Deleted at`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Date when the record was deleted`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCalendarMinus',
      isSystem: true,
      isNullable: true,
      isUIEditable: false,
      settings: { displayFormat: DateDisplayFormat.RELATIVE },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  createdBy: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'createdBy',
      type: FieldMetadataType.ACTOR,
      label: i18nLabel(
        msg({ message: `Created by`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The creator of the record`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCreativeCommonsSa',
      isSystem: true,
      isUIEditable: false,
      isNullable: false,
      defaultValue: {
        source: "'MANUAL'",
        name: "'System'",
        workspaceMemberId: null,
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  updatedBy: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'updatedBy',
      type: FieldMetadataType.ACTOR,
      label: i18nLabel(
        msg({ message: `Updated by`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The workspace member who last updated the record`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconUserCircle',
      isSystem: true,
      isUIEditable: false,
      isNullable: false,
      defaultValue: {
        source: "'MANUAL'",
        name: "'System'",
        workspaceMemberId: null,
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  position: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'position',
      type: FieldMetadataType.POSITION,
      label: i18nLabel(
        msg({ message: `Position`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Conversation Message record position`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconHierarchy2',
      isSystem: true,
      isNullable: false,
      defaultValue: 0,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  searchVector: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'searchVector',
      type: FieldMetadataType.TS_VECTOR,
      label: i18nLabel(
        msg({ message: `Search vector`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Field used for full-text search`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconUser',
      isSystem: true,
      isNullable: true,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  direction: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'direction',
      type: FieldMetadataType.SELECT,
      label: i18nLabel(
        msg({ message: `Direction`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({ message: `Direction`, context: 'fieldMetadata.description' }),
      ),
      icon: 'IconArrowsLeftRight',
      isNullable: false,
      isUIEditable: false,
      options: [
        {
          id: '8c4574fb-bf6d-402b-88b4-2dd971edf1a0',
          value: 'INBOUND',
          label: i18nLabel(
            msg({ message: `Inbound`, context: 'fieldMetadata.label' }),
          ),
          position: 0,
          color: 'blue',
        },
        {
          id: '1316b9db-01a8-49ee-8fd0-d85ca4b8f4da',
          value: 'OUTBOUND',
          label: i18nLabel(
            msg({ message: `Outbound`, context: 'fieldMetadata.label' }),
          ),
          position: 1,
          color: 'green',
        },
      ],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  channelType: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'channelType',
      type: FieldMetadataType.SELECT,
      label: i18nLabel(
        msg({ message: `Channel`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The channel this message was sent on`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconMessageCircle2',
      isNullable: false,
      isUIEditable: false,
      options: [
        {
          id: 'e0e63c54-cb57-42e3-97a3-1e5af2f66b74',
          value: 'EMAIL',
          label: i18nLabel(
            msg({ message: `Email`, context: 'fieldMetadata.label' }),
          ),
          position: 0,
          color: 'blue',
        },
        {
          id: 'b18faa71-e848-45ce-9c13-3013d0b133e1',
          value: 'WHATSAPP',
          label: i18nLabel(
            msg({ message: `WhatsApp`, context: 'fieldMetadata.label' }),
          ),
          position: 1,
          color: 'green',
        },
      ],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  externalMessageId: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'externalMessageId',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(
        msg({ message: `External Message Id`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The provider message id (WhatsApp wamid or email Message-ID)`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconId',
      isNullable: true,
      isUIEditable: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  body: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'body',
      type: FieldMetadataType.TEXT,
      label: i18nLabel(
        msg({ message: `Body`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({ message: `Message body`, context: 'fieldMetadata.description' }),
      ),
      icon: 'IconNotes',
      isNullable: true,
      isUIEditable: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  sentAt: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'sentAt',
      type: FieldMetadataType.DATE_TIME,
      label: i18nLabel(
        msg({ message: `Sent At`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Date the message was sent`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconSend',
      isNullable: true,
      isUIEditable: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  receivedAt: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'receivedAt',
      type: FieldMetadataType.DATE_TIME,
      label: i18nLabel(
        msg({ message: `Received At`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Date the message was received`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconInbox',
      isNullable: true,
      isUIEditable: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  deliveryStatus: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'deliveryStatus',
      type: FieldMetadataType.SELECT,
      label: i18nLabel(
        msg({ message: `Delivery Status`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Delivery status`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconTruckDelivery',
      isNullable: true,
      isUIEditable: false,
      options: [
        {
          id: '813bc1ae-fa7a-47b9-8214-e7120c657655',
          value: 'SENT',
          label: i18nLabel(
            msg({ message: `Sent`, context: 'fieldMetadata.label' }),
          ),
          position: 0,
          color: 'sky',
        },
        {
          id: '3b5e9516-042d-4104-a897-bb3c7ce7c024',
          value: 'DELIVERED',
          label: i18nLabel(
            msg({ message: `Delivered`, context: 'fieldMetadata.label' }),
          ),
          position: 1,
          color: 'blue',
        },
        {
          id: '9236d9a7-6f40-45d9-9d1f-9bf6137dfa31',
          value: 'READ',
          label: i18nLabel(
            msg({ message: `Read`, context: 'fieldMetadata.label' }),
          ),
          position: 2,
          color: 'green',
        },
        {
          id: '2a313532-f00f-4cb0-ac1a-881eefc816f0',
          value: 'FAILED',
          label: i18nLabel(
            msg({ message: `Failed`, context: 'fieldMetadata.label' }),
          ),
          position: 3,
          color: 'red',
        },
      ],
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  isDraft: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'isDraft',
      type: FieldMetadataType.BOOLEAN,
      label: i18nLabel(
        msg({ message: `Draft`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Whether the message is a draft`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconFilePencil',
      isNullable: false,
      isUIEditable: false,
      defaultValue: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  isInternalNote: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'isInternalNote',
      type: FieldMetadataType.BOOLEAN,
      label: i18nLabel(
        msg({ message: `Internal Note`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `Whether the message is an internal note, not sent to the customer`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconNote',
      isNullable: false,
      isUIEditable: false,
      defaultValue: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  rawPayload: createStandardFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      fieldName: 'rawPayload',
      type: FieldMetadataType.RAW_JSON,
      label: i18nLabel(
        msg({ message: `Raw Payload`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({
          message: `The raw provider payload for this message`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: 'IconCode',
      isNullable: true,
      isUIEditable: false,
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  conversation: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'conversation',
      label: i18nLabel(
        msg({ message: `Conversation`, context: 'fieldMetadata.label' }),
      ),
      description: i18nLabel(
        msg({ message: `Conversation`, context: 'fieldMetadata.description' }),
      ),
      icon: 'IconMessageCircle2',
      isNullable: false,
      isUIEditable: false,
      targetObjectName: 'conversation',
      targetFieldName: 'messages',
      settings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: RelationOnDeleteAction.CASCADE,
        joinColumnName: 'conversationId',
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
  attachments: createStandardRelationFieldFlatMetadata({
    objectName,
    workspaceId,
    context: {
      type: FieldMetadataType.RELATION,
      morphId: null,
      fieldName: 'attachments',
      isSystemSideEffect: true,
      label: i18nLabel(
        STANDARD_RELATION_FIELD_PROPERTIES_BY_RELATION_OBJECT.attachment.label,
      ),
      description: i18nLabel(
        msg({
          message: `Conversation message attachments`,
          context: 'fieldMetadata.description',
        }),
      ),
      icon: STANDARD_RELATION_FIELD_PROPERTIES_BY_RELATION_OBJECT.attachment
        .icon,
      isNullable: true,
      targetObjectName: 'attachment',
      targetFieldName: 'conversationMessage',
      settings: {
        relationType: RelationType.ONE_TO_MANY,
      },
    },
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
  }),
});
