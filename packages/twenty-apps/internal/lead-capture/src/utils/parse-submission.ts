import { type FormField } from 'src/constants/form-field-options';
import {
  HONEYPOT_FIELD_NAME,
  MAX_LONG_ANSWER_CHARACTERS,
  MAX_SHORT_ANSWER_CHARACTERS,
  PAGE_URL_FIELD_NAME,
  REFERRER_FIELD_NAME,
  RENDERED_AT_FIELD_NAME,
  UTM_FIELD_NAMES,
} from 'src/constants/lead-capture-settings';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;
const MAX_META_CHARACTERS = 500;

export type SubmissionMeta = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  pageUrl: string | null;
  referrer: string | null;
};

export type ParsedSubmission = {
  answers: Record<string, string>;
  errors: Record<string, string>;
  meta: SubmissionMeta;
  isHoneypotFilled: boolean;
  renderedAtMs: number | null;
};

const readValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(readValue).filter(Boolean).join(', ');
  }

  return '';
};

const readMeta = (
  name: string,
  body: Record<string, unknown>,
  query: Record<string, string | undefined>,
): string | null =>
  (readValue(body[name]) || readValue(query[name])).slice(
    0,
    MAX_META_CHARACTERS,
  ) || null;

const validateAnswer = (field: FormField, answer: string): string | null => {
  if (answer.length === 0) {
    return field.required ? `${field.label} is required.` : null;
  }

  if (field.type === 'email' && !EMAIL_PATTERN.test(answer)) {
    return 'Please enter a valid email address.';
  }

  if (field.type === 'phone') {
    const digitCount = answer.replace(/\D/g, '').length;

    if (digitCount < MIN_PHONE_DIGITS || digitCount > MAX_PHONE_DIGITS) {
      return 'Please enter a valid phone number.';
    }
  }

  if (field.type === 'select' && !field.options.includes(answer)) {
    return 'Please choose one of the options.';
  }

  return null;
};

export const parseSubmission = ({
  fields,
  body,
  query,
  referrerHeader,
}: {
  fields: FormField[];
  body: Record<string, unknown>;
  query: Record<string, string | undefined>;
  referrerHeader: string | null;
}): ParsedSubmission => {
  const answers: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const maxCharacters =
      field.type === 'textarea'
        ? MAX_LONG_ANSWER_CHARACTERS
        : MAX_SHORT_ANSWER_CHARACTERS;
    const answer = readValue(body[field.key]).slice(0, maxCharacters);
    const error = validateAnswer(field, answer);

    if (error !== null) {
      errors[field.key] = error;
    }

    if (answer.length > 0) {
      answers[field.key] = answer;
    }
  }

  // Without an email or phone the lead cannot be contacted or matched to an
  // existing contact, so at least one is always required.
  const contactFields = fields.filter(
    (field) =>
      field.mapsTo === 'person.email' || field.mapsTo === 'person.phone',
  );

  // When one of them is required, its own "required" message already says it.
  if (
    contactFields.length > 0 &&
    contactFields.every((field) => !field.required && !answers[field.key])
  ) {
    for (const field of contactFields) {
      errors[field.key] ??= 'Please give an email address or phone number.';
    }
  }

  const [utmSource, utmMedium, utmCampaign, utmTerm, utmContent] =
    UTM_FIELD_NAMES.map((name) => readMeta(name, body, query));
  const renderedAtMs = Number(readValue(body[RENDERED_AT_FIELD_NAME]));

  return {
    answers,
    errors,
    meta: {
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      pageUrl:
        readMeta(PAGE_URL_FIELD_NAME, body, query) ??
        referrerHeader?.slice(0, MAX_META_CHARACTERS) ??
        null,
      referrer: readMeta(REFERRER_FIELD_NAME, body, query),
    },
    isHoneypotFilled: readValue(body[HONEYPOT_FIELD_NAME]).length > 0,
    renderedAtMs:
      Number.isFinite(renderedAtMs) && renderedAtMs > 0 ? renderedAtMs : null,
  };
};
