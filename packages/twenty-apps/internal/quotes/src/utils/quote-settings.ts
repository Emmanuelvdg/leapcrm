import { TAX_SCHEMES, type TaxScheme } from 'src/constants/quote-options';
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

export type QuoteSettings = {
  sellerName: string | null;
  sellerAddress: string | null;
  sellerTaxId: string | null;
  sellerState: string | null;
  logoUrl: string | null;
  brandColor: string;
  defaultCurrency: string;
  defaultTaxScheme: TaxScheme;
  validDays: number;
  defaultTerms: string;
  quoteNumberPrefix: string;
  approvalThreshold: number;
  approverEmails: string[];
  acceptedDealStage: string | null;
};

const HEX_COLOR_PATTERN = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

const text = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';

  return trimmed.length > 0 ? trimmed : null;
};

const number = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);

  return value !== undefined && value.trim() !== '' && Number.isFinite(parsed)
    ? parsed
    : fallback;
};

const httpUrl = (value: string | undefined): string | null => {
  const candidate = text(value);

  return candidate && /^https?:\/\//i.test(candidate) ? candidate : null;
};

export const parseEmailList = (value: string | undefined): string[] => [
  ...new Set(
    (value ?? '')
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.includes('@')),
  ),
];

export const readQuoteSettings = (
  read: (name: string) => string | undefined,
): QuoteSettings => {
  const currency = text(read(DEFAULT_CURRENCY_VARIABLE_NAME))?.toUpperCase();
  const taxScheme = text(read(DEFAULT_TAX_SCHEME_VARIABLE_NAME))?.toUpperCase();
  const brandColor = text(read(BRAND_COLOR_VARIABLE_NAME));

  return {
    sellerName: text(read(SELLER_NAME_VARIABLE_NAME)),
    sellerAddress: text(read(SELLER_ADDRESS_VARIABLE_NAME)),
    sellerTaxId: text(read(SELLER_TAX_ID_VARIABLE_NAME)),
    sellerState: text(read(SELLER_STATE_VARIABLE_NAME)),
    logoUrl: httpUrl(read(LOGO_URL_VARIABLE_NAME)),
    brandColor:
      brandColor && HEX_COLOR_PATTERN.test(brandColor)
        ? brandColor
        : DEFAULT_BRAND_COLOR,
    defaultCurrency:
      currency && CURRENCY_CODE_PATTERN.test(currency)
        ? currency
        : DEFAULT_CURRENCY,
    defaultTaxScheme:
      TAX_SCHEMES.find((scheme) => scheme === taxScheme) ?? DEFAULT_TAX_SCHEME,
    validDays: Math.max(
      1,
      Math.round(number(read(VALID_DAYS_VARIABLE_NAME), DEFAULT_VALID_DAYS)),
    ),
    defaultTerms: text(read(DEFAULT_TERMS_VARIABLE_NAME)) ?? DEFAULT_TERMS,
    quoteNumberPrefix:
      text(read(QUOTE_NUMBER_PREFIX_VARIABLE_NAME))?.replace(/\s+/g, '') ??
      DEFAULT_QUOTE_NUMBER_PREFIX,
    approvalThreshold: number(
      read(APPROVAL_THRESHOLD_VARIABLE_NAME),
      DEFAULT_APPROVAL_THRESHOLD,
    ),
    approverEmails: parseEmailList(read(APPROVER_EMAILS_VARIABLE_NAME)),
    acceptedDealStage: text(read(ACCEPTED_DEAL_STAGE_VARIABLE_NAME)),
  };
};

export const getServerQuoteSettings = (): QuoteSettings =>
  readQuoteSettings((name) => process.env[name]);

// Approvals only apply once someone is named to approve; a threshold with no
// approvers would leave quotes stuck in "Pending approval".
export const needsApproval = (
  maxDiscountPercent: number,
  settings: Pick<QuoteSettings, 'approvalThreshold' | 'approverEmails'>,
): boolean =>
  settings.approverEmails.length > 0 &&
  maxDiscountPercent > settings.approvalThreshold;
