import { defineView, ViewType } from 'twenty-sdk/define';

import {
  FORM_SUBMISSIONS_RELATION_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_CREATE_DEAL_FIELD_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_LEAD_SOURCE_FIELD_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
  LEAD_FORM_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
  LEAD_FORMS_VIEW_CREATE_DEAL_UNIVERSAL_IDENTIFIER,
  LEAD_FORMS_VIEW_LEAD_SOURCE_UNIVERSAL_IDENTIFIER,
  LEAD_FORMS_VIEW_NAME_UNIVERSAL_IDENTIFIER,
  LEAD_FORMS_VIEW_STATUS_UNIVERSAL_IDENTIFIER,
  LEAD_FORMS_VIEW_SUBMISSIONS_UNIVERSAL_IDENTIFIER,
  LEAD_FORMS_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: LEAD_FORMS_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Forms overview',
  objectUniversalIdentifier: LEAD_FORM_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconForms',
  position: 0,
  fields: [
    {
      universalIdentifier: LEAD_FORMS_VIEW_NAME_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        LEAD_FORM_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: LEAD_FORMS_VIEW_STATUS_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        LEAD_FORM_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 110,
    },
    {
      universalIdentifier: LEAD_FORMS_VIEW_LEAD_SOURCE_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        LEAD_FORM_LEAD_SOURCE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: LEAD_FORMS_VIEW_CREATE_DEAL_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        LEAD_FORM_CREATE_DEAL_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: LEAD_FORMS_VIEW_SUBMISSIONS_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        FORM_SUBMISSIONS_RELATION_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 200,
    },
  ],
});
