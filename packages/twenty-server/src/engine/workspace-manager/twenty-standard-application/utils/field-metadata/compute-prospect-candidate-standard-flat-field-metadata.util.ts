import { msg } from '@lingui/core/macro';
import { i18nLabel } from 'src/engine/workspace-manager/twenty-standard-application/utils/i18n-label.util';
import {
  DateDisplayFormat,
  FieldMetadataType,
  RelationOnDeleteAction,
  RelationType,
} from 'twenty-shared/types';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type AllStandardObjectFieldName } from 'src/engine/workspace-manager/twenty-standard-application/types/all-standard-object-field-name.type';
import {
  type CreateStandardFieldArgs,
  createStandardFieldFlatMetadata,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/create-standard-field-flat-metadata.util';
import { createStandardRelationFieldFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/create-standard-relation-field-flat-metadata.util';
export const buildProspectCandidateStandardFlatFieldMetadatas = ({
  now,
  objectName,
  workspaceId,
  standardObjectMetadataRelatedEntityIds,
  dependencyFlatEntityMaps,
  twentyStandardApplicationId,
}: Omit<
  CreateStandardFieldArgs<'prospectCandidate', FieldMetadataType>,
  'context'
>): Record<
  AllStandardObjectFieldName<'prospectCandidate'>,
  FlatFieldMetadata
> => {
  const base = {
    standardObjectMetadataRelatedEntityIds,
    dependencyFlatEntityMaps,
    twentyStandardApplicationId,
    now,
    objectName,
    workspaceId,
  };

  return {
    id: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'id',
        type: FieldMetadataType.UUID,
        label: i18nLabel(
          msg({ message: `Id`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({ message: `Id`, context: 'fieldMetadata.description' }),
        ),
        icon: 'Icon123',
        isSystem: true,
        isNullable: false,
        isUIEditable: false,
        defaultValue: 'uuid',
      },
    }),
    createdAt: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'createdAt',
        type: FieldMetadataType.DATE_TIME,
        label: i18nLabel(
          msg({ message: `Creation date`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Creation date`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconCalendar',
        isSystem: true,
        isNullable: false,
        isUIEditable: false,
        defaultValue: 'now',
        settings: { displayFormat: DateDisplayFormat.RELATIVE },
      },
    }),
    updatedAt: createStandardFieldFlatMetadata({
      ...base,
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
    }),
    deletedAt: createStandardFieldFlatMetadata({
      ...base,
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
    }),
    position: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'position',
        type: FieldMetadataType.POSITION,
        label: i18nLabel(
          msg({ message: `Position`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Prospect candidate record position`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconHierarchy2',
        isSystem: true,
        isNullable: false,
        defaultValue: 0,
      },
    }),
    createdBy: createStandardFieldFlatMetadata({
      ...base,
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
    }),
    updatedBy: createStandardFieldFlatMetadata({
      ...base,
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
    }),
    searchVector: createStandardFieldFlatMetadata({
      ...base,
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
    }),
    name: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'name',
        type: FieldMetadataType.TEXT,
        label: i18nLabel(
          msg({ message: `Name`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Company name as returned by the source`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconBuildingStore',
        isNullable: true,
      },
    }),
    domain: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'domain',
        type: FieldMetadataType.LINKS,
        label: i18nLabel(
          msg({ message: `Domain`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `The company website, when a source provides it`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconLink',
        isNullable: true,
        settings: {
          maxNumberOfValues: 1,
        },
      },
    }),
    registrationNumber: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'registrationNumber',
        type: FieldMetadataType.TEXT,
        label: i18nLabel(
          msg({
            message: `Registration number`,
            context: 'fieldMetadata.label',
          }),
        ),
        description: i18nLabel(
          msg({
            message: `Identifier in the company registry of its home jurisdiction`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconId',
        isNullable: true,
      },
    }),
    registrationAuthority: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'registrationAuthority',
        type: FieldMetadataType.TEXT,
        label: i18nLabel(
          msg({
            message: `Registration authority`,
            context: 'fieldMetadata.label',
          }),
        ),
        description: i18nLabel(
          msg({
            message: `The registry that issued the registration number`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconBuildingBank',
        isNullable: true,
      },
    }),
    lei: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'lei',
        type: FieldMetadataType.TEXT,
        label: i18nLabel(
          msg({ message: `LEI`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Legal Entity Identifier`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconFingerprint',
        isNullable: true,
      },
    }),
    country: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'country',
        type: FieldMetadataType.TEXT,
        label: i18nLabel(
          msg({ message: `Country`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Country code of the company`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconWorld',
        isNullable: true,
      },
    }),
    region: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'region',
        type: FieldMetadataType.TEXT,
        label: i18nLabel(
          msg({ message: `Region`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Region or state within the country`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconMap',
        isNullable: true,
      },
    }),
    industry: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'industry',
        type: FieldMetadataType.TEXT,
        label: i18nLabel(
          msg({ message: `Industry`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Industry as described by the source`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconBriefcase',
        isNullable: true,
      },
    }),
    industryCode: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'industryCode',
        type: FieldMetadataType.TEXT,
        label: i18nLabel(
          msg({ message: `Industry code`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Industry classification code from the source`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconHash',
        isNullable: true,
      },
    }),
    employeeCount: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'employeeCount',
        type: FieldMetadataType.NUMBER,
        label: i18nLabel(
          msg({ message: `Employees`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Employee count when a source provides it, never estimated`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconUsers',
        isNullable: true,
      },
    }),
    description: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'description',
        type: FieldMetadataType.TEXT,
        label: i18nLabel(
          msg({ message: `Description`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Company description as provided by the source`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconFileText',
        isNullable: true,
      },
    }),
    lifecycleStage: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'lifecycleStage',
        type: FieldMetadataType.SELECT,
        label: i18nLabel(
          msg({ message: `Stage`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Where the candidate is in the prospecting lifecycle`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconProgressCheck',
        isNullable: false,
        isUIEditable: false,
        defaultValue: "'DISCOVERED'",
        options: [
          {
            id: '1db5d04a-c013-4c8d-861d-b631e48eb84d',
            value: 'DISCOVERED',
            label: i18nLabel(
              msg({ message: `Discovered`, context: 'fieldMetadata.label' }),
            ),
            position: 0,
            color: 'blue',
          },
          {
            id: '38cc7589-630e-4919-8700-15d01b6f0c9a',
            value: 'RESEARCHING',
            label: i18nLabel(
              msg({ message: `Researching`, context: 'fieldMetadata.label' }),
            ),
            position: 1,
            color: 'sky',
          },
          {
            id: '61645a09-d6b5-4d86-ae72-0504c994abe4',
            value: 'QUALIFIED',
            label: i18nLabel(
              msg({ message: `Qualified`, context: 'fieldMetadata.label' }),
            ),
            position: 2,
            color: 'green',
          },
          {
            id: '99f2b491-9c12-44a4-b3e9-766c3591c242',
            value: 'CONTACT_RESEARCH',
            label: i18nLabel(
              msg({
                message: `Contact research`,
                context: 'fieldMetadata.label',
              }),
            ),
            position: 3,
            color: 'turquoise',
          },
          {
            id: '267a9c09-8159-4bf0-889c-fd9f123b86e5',
            value: 'READY_FOR_REVIEW',
            label: i18nLabel(
              msg({
                message: `Ready for review`,
                context: 'fieldMetadata.label',
              }),
            ),
            position: 4,
            color: 'purple',
          },
          {
            id: '2c9eb7c9-7ebd-4bb3-99a2-5c862ba06975',
            value: 'APPROVED',
            label: i18nLabel(
              msg({ message: `Approved`, context: 'fieldMetadata.label' }),
            ),
            position: 5,
            color: 'green',
          },
          {
            id: 'c5e0b3af-4c19-43af-9a4d-d39cddd4f29a',
            value: 'READY_FOR_OUTREACH',
            label: i18nLabel(
              msg({
                message: `Ready for outreach`,
                context: 'fieldMetadata.label',
              }),
            ),
            position: 6,
            color: 'blue',
          },
          {
            id: '640c267b-c58c-4367-b4f8-b2c93852c0e0',
            value: 'ACTIVE_OUTREACH',
            label: i18nLabel(
              msg({
                message: `Active outreach`,
                context: 'fieldMetadata.label',
              }),
            ),
            position: 7,
            color: 'orange',
          },
          {
            id: '8d73ea56-1136-40f1-9f7b-85b25b6e4cdd',
            value: 'ENGAGED',
            label: i18nLabel(
              msg({ message: `Engaged`, context: 'fieldMetadata.label' }),
            ),
            position: 8,
            color: 'yellow',
          },
          {
            id: 'c6120bea-dc3b-497a-8cd6-b39620ecb745',
            value: 'MEETING_BOOKED',
            label: i18nLabel(
              msg({
                message: `Meeting booked`,
                context: 'fieldMetadata.label',
              }),
            ),
            position: 9,
            color: 'green',
          },
          {
            id: '73ae62b4-2d4a-412b-956f-1a5b115f3eed',
            value: 'HANDED_OFF',
            label: i18nLabel(
              msg({ message: `Handed off`, context: 'fieldMetadata.label' }),
            ),
            position: 10,
            color: 'gray',
          },
          {
            id: 'a6ffc13c-ffe0-4ccb-8e36-c732f39f3fcb',
            value: 'DISQUALIFIED',
            label: i18nLabel(
              msg({ message: `Disqualified`, context: 'fieldMetadata.label' }),
            ),
            position: 11,
            color: 'red',
          },
          {
            id: '764d825d-1587-4864-95cc-6ce540716dcd',
            value: 'INSUFFICIENT_EVIDENCE',
            label: i18nLabel(
              msg({
                message: `Insufficient evidence`,
                context: 'fieldMetadata.label',
              }),
            ),
            position: 12,
            color: 'gray',
          },
          {
            id: '8e47a212-2565-4bfe-8de6-2e6779ffcc5a',
            value: 'HUMAN_REVIEW',
            label: i18nLabel(
              msg({ message: `Needs review`, context: 'fieldMetadata.label' }),
            ),
            position: 13,
            color: 'orange',
          },
          {
            id: '3e3e0fa9-66dd-4df8-bd96-39343c826cd3',
            value: 'SUPPRESSED',
            label: i18nLabel(
              msg({ message: `Suppressed`, context: 'fieldMetadata.label' }),
            ),
            position: 14,
            color: 'red',
          },
          {
            id: 'e5301798-5d8a-4bdd-a9ba-af5dde7f40ac',
            value: 'NURTURE',
            label: i18nLabel(
              msg({ message: `Nurture`, context: 'fieldMetadata.label' }),
            ),
            position: 15,
            color: 'sky',
          },
          {
            id: '6e75417b-da7e-4a55-a93b-8deb08965207',
            value: 'FAILED',
            label: i18nLabel(
              msg({ message: `Failed`, context: 'fieldMetadata.label' }),
            ),
            position: 16,
            color: 'red',
          },
          {
            id: '026e2956-d7a2-4c4c-af59-41030033d5a4',
            value: 'CANCELLED',
            label: i18nLabel(
              msg({ message: `Cancelled`, context: 'fieldMetadata.label' }),
            ),
            position: 17,
            color: 'gray',
          },
        ],
      },
    }),
    matchStatus: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'matchStatus',
        type: FieldMetadataType.SELECT,
        label: i18nLabel(
          msg({ message: `Match`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Whether the candidate matches a company already in the CRM`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconGitCompare',
        isNullable: true,
        isUIEditable: false,
        options: [
          {
            id: '7045d632-2bec-45b8-aaea-1b8e2189cbbd',
            value: 'CONFIRMED_MATCH',
            label: i18nLabel(
              msg({
                message: `Confirmed match`,
                context: 'fieldMetadata.label',
              }),
            ),
            position: 0,
            color: 'green',
          },
          {
            id: '7d15e031-773c-4c48-8d44-935eab4e5802',
            value: 'PROBABLE_MATCH',
            label: i18nLabel(
              msg({
                message: `Probable match`,
                context: 'fieldMetadata.label',
              }),
            ),
            position: 1,
            color: 'orange',
          },
          {
            id: '612a4534-ce8d-46a2-85d5-a5b500e4e4cc',
            value: 'DISTINCT',
            label: i18nLabel(
              msg({ message: `Distinct`, context: 'fieldMetadata.label' }),
            ),
            position: 2,
            color: 'blue',
          },
          {
            id: '27917c9c-f270-4b52-9af7-1fab0d2e2e9e',
            value: 'INSUFFICIENT_INFORMATION',
            label: i18nLabel(
              msg({
                message: `Insufficient information`,
                context: 'fieldMetadata.label',
              }),
            ),
            position: 3,
            color: 'gray',
          },
        ],
      },
    }),
    identityKey: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'identityKey',
        type: FieldMetadataType.TEXT,
        label: i18nLabel(
          msg({ message: `Identity key`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Deterministic key used to deduplicate candidates within a campaign`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconKey',
        isSystem: true,
        isNullable: true,
        isUIEditable: false,
      },
    }),
    sources: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'sources',
        type: FieldMetadataType.RAW_JSON,
        label: i18nLabel(
          msg({ message: `Sources`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Where the candidate was found, with retrieval dates and licences`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconDatabase',
        isNullable: true,
        isUIEditable: false,
      },
    }),
    attributes: createStandardFieldFlatMetadata({
      ...base,
      context: {
        fieldName: 'attributes',
        type: FieldMetadataType.RAW_JSON,
        label: i18nLabel(
          msg({ message: `Attributes`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `Additional facts returned by the sources`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconListDetails',
        isNullable: true,
        isUIEditable: false,
      },
    }),
    campaign: createStandardRelationFieldFlatMetadata({
      ...base,
      context: {
        type: FieldMetadataType.RELATION,
        morphId: null,
        fieldName: 'campaign',
        label: i18nLabel(
          msg({ message: `Campaign`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `The campaign that found the candidate`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconTargetArrow',
        isNullable: true,
        isUIEditable: false,
        targetObjectName: 'prospectingCampaign',
        targetFieldName: 'candidates',
        settings: {
          relationType: RelationType.MANY_TO_ONE,
          onDelete: RelationOnDeleteAction.CASCADE,
          joinColumnName: 'campaignId',
        },
      },
    }),
    matchedCompany: createStandardRelationFieldFlatMetadata({
      ...base,
      context: {
        type: FieldMetadataType.RELATION,
        morphId: null,
        fieldName: 'matchedCompany',
        label: i18nLabel(
          msg({ message: `Matched company`, context: 'fieldMetadata.label' }),
        ),
        description: i18nLabel(
          msg({
            message: `The existing CRM company this candidate matches`,
            context: 'fieldMetadata.description',
          }),
        ),
        icon: 'IconBuildingSkyscraper',
        isNullable: true,
        targetObjectName: 'company',
        targetFieldName: 'prospectCandidates',
        settings: {
          relationType: RelationType.MANY_TO_ONE,
          onDelete: RelationOnDeleteAction.SET_NULL,
          joinColumnName: 'matchedCompanyId',
        },
      },
    }),
  };
};
