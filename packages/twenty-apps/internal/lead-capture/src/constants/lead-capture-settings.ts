export const DEFAULT_PHONE_COUNTRY_VARIABLE_NAME = 'DEFAULT_PHONE_COUNTRY';
export const CLOSED_STAGES_VARIABLE_NAME = 'CLOSED_STAGES';

export const DEFAULT_PHONE_COUNTRY = 'IN';
export const DEFAULT_CLOSED_STAGES = ['CUSTOMER', 'LOST'];

export const FORM_ROUTE_BASE_PATH = '/lead-capture/forms';
export const SERVE_FORM_ROUTE_PATH = `${FORM_ROUTE_BASE_PATH}/:formId`;
export const SUBMIT_FORM_ROUTE_PATH = `${FORM_ROUTE_BASE_PATH}/:formId/submissions`;

// Humans take a few seconds to fill even a short form; bots post instantly.
export const MIN_FILL_SECONDS = 3;
export const RATE_LIMIT_WINDOW_MINUTES = 10;
export const RATE_LIMIT_MAX_SUBMISSIONS = 5;

export const MAX_FORM_FIELDS = 25;
export const MAX_SHORT_ANSWER_CHARACTERS = 300;
export const MAX_LONG_ANSWER_CHARACTERS = 3_000;

export const HONEYPOT_FIELD_NAME = '_lc_website';
export const RENDERED_AT_FIELD_NAME = '_lc_t';
export const PAGE_URL_FIELD_NAME = 'page_url';
export const REFERRER_FIELD_NAME = 'referrer';
export const UTM_FIELD_NAMES = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'content-type',
  'origin',
  'referer',
  'host',
  'user-agent',
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
];
