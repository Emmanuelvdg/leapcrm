import {
  defineApplicationRole,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  APP_DISPLAY_NAME,
  DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  QUOTE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

const permissions = (
  objectUniversalIdentifier: string,
  canUpdateObjectRecords: boolean,
) => ({
  objectUniversalIdentifier,
  canReadObjectRecords: true,
  canUpdateObjectRecords,
  canSoftDeleteObjectRecords: false,
  canDestroyObjectRecords: false,
});

export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: `${APP_DISPLAY_NAME} default function role`,
  description:
    'Numbers, sends, approves and records responses to quotes; updates the deal amount and stage on acceptance; writes notes and approval tasks.',
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: [
    permissions(QUOTE_OBJECT_UNIVERSAL_IDENTIFIER, true),
    permissions(LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER, true),
    permissions(PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER, false),
    permissions(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
      true,
    ),
    permissions(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      false,
    ),
    permissions(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
      false,
    ),
    permissions(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
      false,
    ),
    permissions(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.note.universalIdentifier,
      true,
    ),
    permissions(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.noteTarget.universalIdentifier,
      true,
    ),
    permissions(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
      true,
    ),
    permissions(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.taskTarget.universalIdentifier,
      true,
    ),
  ],
});
