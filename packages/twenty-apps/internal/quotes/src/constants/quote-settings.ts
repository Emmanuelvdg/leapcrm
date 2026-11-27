export const SELLER_NAME_VARIABLE_NAME = 'SELLER_NAME';
export const SELLER_ADDRESS_VARIABLE_NAME = 'SELLER_ADDRESS';
export const SELLER_TAX_ID_VARIABLE_NAME = 'SELLER_TAX_ID';
export const SELLER_STATE_VARIABLE_NAME = 'SELLER_STATE';
export const LOGO_URL_VARIABLE_NAME = 'LOGO_URL';
export const BRAND_COLOR_VARIABLE_NAME = 'BRAND_COLOR';
export const DEFAULT_CURRENCY_VARIABLE_NAME = 'DEFAULT_CURRENCY';
export const DEFAULT_TAX_SCHEME_VARIABLE_NAME = 'DEFAULT_TAX_SCHEME';
export const VALID_DAYS_VARIABLE_NAME = 'QUOTE_VALID_DAYS';
export const DEFAULT_TERMS_VARIABLE_NAME = 'DEFAULT_TERMS';
export const QUOTE_NUMBER_PREFIX_VARIABLE_NAME = 'QUOTE_NUMBER_PREFIX';
export const APPROVAL_THRESHOLD_VARIABLE_NAME = 'DISCOUNT_APPROVAL_THRESHOLD';
export const APPROVER_EMAILS_VARIABLE_NAME = 'APPROVER_EMAILS';
export const ACCEPTED_DEAL_STAGE_VARIABLE_NAME = 'ACCEPTED_DEAL_STAGE';

export const DEFAULT_BRAND_COLOR = '#F16205';
export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_TAX_SCHEME = 'GST';
export const DEFAULT_VALID_DAYS = 30;
export const DEFAULT_TERMS =
  'Prices are valid until the date shown on this quote. Payment is due within 30 days of the invoice date.';
export const DEFAULT_QUOTE_NUMBER_PREFIX = 'Q';
export const DEFAULT_APPROVAL_THRESHOLD = 10;

export const QUOTE_ACTIONS_ROUTE_PATH = '/quotes/actions';
export const SERVE_QUOTE_ROUTE_PATH = '/quotes/view/:quoteId';
export const RESPOND_TO_QUOTE_ROUTE_PATH = '/quotes/view/:quoteId/response';

export const PUBLIC_ROUTE_FORWARDED_HEADERS = [
  'accept',
  'content-type',
  'user-agent',
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
];

export const MAX_LINE_ITEMS = 200;
