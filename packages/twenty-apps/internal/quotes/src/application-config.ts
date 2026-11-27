import { defineApplication, FieldType } from 'twenty-sdk/define';

import {
  ACCEPTED_DEAL_STAGE_VARIABLE_NAME,
  APPROVAL_THRESHOLD_VARIABLE_NAME,
  APPROVER_EMAILS_VARIABLE_NAME,
  BRAND_COLOR_VARIABLE_NAME,
  DEFAULT_APPROVAL_THRESHOLD,
  DEFAULT_BRAND_COLOR,
  DEFAULT_CURRENCY,
  DEFAULT_CURRENCY_VARIABLE_NAME,
  DEFAULT_QUOTE_NUMBER_PREFIX,
  DEFAULT_TAX_SCHEME,
  DEFAULT_TAX_SCHEME_VARIABLE_NAME,
  DEFAULT_TERMS,
  DEFAULT_TERMS_VARIABLE_NAME,
  DEFAULT_VALID_DAYS,
  LOGO_URL_VARIABLE_NAME,
  QUOTE_NUMBER_PREFIX_VARIABLE_NAME,
  SELLER_ADDRESS_VARIABLE_NAME,
  SELLER_NAME_VARIABLE_NAME,
  SELLER_STATE_VARIABLE_NAME,
  SELLER_TAX_ID_VARIABLE_NAME,
  VALID_DAYS_VARIABLE_NAME,
} from 'src/constants/quote-settings';
import {
  ACCEPTED_DEAL_STAGE_VARIABLE_UNIVERSAL_IDENTIFIER,
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  APPROVAL_THRESHOLD_VARIABLE_UNIVERSAL_IDENTIFIER,
  APPROVER_EMAILS_VARIABLE_UNIVERSAL_IDENTIFIER,
  BRAND_COLOR_VARIABLE_UNIVERSAL_IDENTIFIER,
  DEFAULT_CURRENCY_VARIABLE_UNIVERSAL_IDENTIFIER,
  DEFAULT_TAX_SCHEME_VARIABLE_UNIVERSAL_IDENTIFIER,
  DEFAULT_TERMS_VARIABLE_UNIVERSAL_IDENTIFIER,
  LOGO_URL_VARIABLE_UNIVERSAL_IDENTIFIER,
  QUOTE_NUMBER_PREFIX_VARIABLE_UNIVERSAL_IDENTIFIER,
  SELLER_ADDRESS_VARIABLE_UNIVERSAL_IDENTIFIER,
  SELLER_NAME_VARIABLE_UNIVERSAL_IDENTIFIER,
  SELLER_STATE_VARIABLE_UNIVERSAL_IDENTIFIER,
  SELLER_TAX_ID_VARIABLE_UNIVERSAL_IDENTIFIER,
  VALID_DAYS_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

const textVariable = (
  universalIdentifier: string,
  description: string,
  value: string,
) => ({
  universalIdentifier,
  description,
  type: FieldType.TEXT as const,
  value,
  isSecret: false,
});

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  author: 'Your Jugaad',
  category: 'Sales',
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  applicationVariables: {
    [SELLER_NAME_VARIABLE_NAME]: textVariable(
      SELLER_NAME_VARIABLE_UNIVERSAL_IDENTIFIER,
      'Legal or trading name printed at the top of quotes. Leave empty to use the workspace name.',
      '',
    ),
    [SELLER_ADDRESS_VARIABLE_NAME]: textVariable(
      SELLER_ADDRESS_VARIABLE_UNIVERSAL_IDENTIFIER,
      'Your address as printed on quotes. Put each line on its own line.',
      '',
    ),
    [SELLER_TAX_ID_VARIABLE_NAME]: textVariable(
      SELLER_TAX_ID_VARIABLE_UNIVERSAL_IDENTIFIER,
      'Your GSTIN, VAT or tax registration number, printed on quotes.',
      '',
    ),
    [SELLER_STATE_VARIABLE_NAME]: textVariable(
      SELLER_STATE_VARIABLE_UNIVERSAL_IDENTIFIER,
      'Indian state you are registered in for GST, e.g. Maharashtra. Customers in the same state get CGST + SGST, others IGST.',
      '',
    ),
    [LOGO_URL_VARIABLE_NAME]: textVariable(
      LOGO_URL_VARIABLE_UNIVERSAL_IDENTIFIER,
      'Optional https:// address of your logo image for the top of quotes.',
      '',
    ),
    [BRAND_COLOR_VARIABLE_NAME]: textVariable(
      BRAND_COLOR_VARIABLE_UNIVERSAL_IDENTIFIER,
      'Accent colour of quotes as a hex code, e.g. #F16205.',
      DEFAULT_BRAND_COLOR,
    ),
    [DEFAULT_CURRENCY_VARIABLE_NAME]: textVariable(
      DEFAULT_CURRENCY_VARIABLE_UNIVERSAL_IDENTIFIER,
      'Currency new quotes start in, as a three-letter code, e.g. INR, USD, AED.',
      DEFAULT_CURRENCY,
    ),
    [DEFAULT_TAX_SCHEME_VARIABLE_NAME]: textVariable(
      DEFAULT_TAX_SCHEME_VARIABLE_UNIVERSAL_IDENTIFIER,
      'Tax new quotes start with: GST, VAT, SALES_TAX or NONE.',
      DEFAULT_TAX_SCHEME,
    ),
    [VALID_DAYS_VARIABLE_NAME]: {
      universalIdentifier: VALID_DAYS_VARIABLE_UNIVERSAL_IDENTIFIER,
      description: 'How many days a new quote stays valid.',
      type: FieldType.NUMBER,
      value: DEFAULT_VALID_DAYS,
      isSecret: false,
    },
    [DEFAULT_TERMS_VARIABLE_NAME]: textVariable(
      DEFAULT_TERMS_VARIABLE_UNIVERSAL_IDENTIFIER,
      'Terms printed on new quotes; each quote can change them.',
      DEFAULT_TERMS,
    ),
    [QUOTE_NUMBER_PREFIX_VARIABLE_NAME]: textVariable(
      QUOTE_NUMBER_PREFIX_VARIABLE_UNIVERSAL_IDENTIFIER,
      'Start of quote numbers, e.g. Q gives Q-2026-0001.',
      DEFAULT_QUOTE_NUMBER_PREFIX,
    ),
    [APPROVAL_THRESHOLD_VARIABLE_NAME]: {
      universalIdentifier: APPROVAL_THRESHOLD_VARIABLE_UNIVERSAL_IDENTIFIER,
      description:
        'Quotes with any line discounted by more than this percentage need approval before they are sent.',
      type: FieldType.NUMBER,
      value: DEFAULT_APPROVAL_THRESHOLD,
      isSecret: false,
    },
    [APPROVER_EMAILS_VARIABLE_NAME]: textVariable(
      APPROVER_EMAILS_VARIABLE_UNIVERSAL_IDENTIFIER,
      'Comma-separated emails of the teammates who approve discounts. Leave empty to switch approvals off.',
      '',
    ),
    [ACCEPTED_DEAL_STAGE_VARIABLE_NAME]: textVariable(
      ACCEPTED_DEAL_STAGE_VARIABLE_UNIVERSAL_IDENTIFIER,
      'Stage value a deal moves to when its quote is accepted, e.g. CUSTOMER. Leave empty to only update the deal amount.',
      '',
    ),
  },
});
