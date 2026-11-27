import {
  FORM_FIELD_TARGETS,
  FORM_FIELD_TYPES,
  type FormField,
  type FormFieldTarget,
  type FormFieldType,
} from 'src/constants/form-field-options';
import { MAX_FORM_FIELDS } from 'src/constants/lead-capture-settings';

const MAX_LABEL_CHARACTERS = 120;
const MAX_KEY_CHARACTERS = 40;
const MAX_OPTIONS = 50;
const MAX_OPTION_CHARACTERS = 120;
// Names the form itself uses for spam checks and source tracking.
const RESERVED_KEY_PATTERN = /^(_lc_|utm_|page_url$|referrer$)/;

const readString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const toFieldKey = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, 'field_$1')
    .slice(0, MAX_KEY_CHARACTERS);

const defaultTargetForType = (type: FormFieldType): FormFieldTarget => {
  if (type === 'email') {
    return 'person.email';
  }

  if (type === 'phone') {
    return 'person.phone';
  }

  return 'note';
};

const parseField = (value: unknown): FormField | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const label = readString(raw.label).slice(0, MAX_LABEL_CHARACTERS);
  const key = toFieldKey(readString(raw.key) || label);

  if (
    label.length === 0 ||
    key.length === 0 ||
    RESERVED_KEY_PATTERN.test(key)
  ) {
    return undefined;
  }

  const type = FORM_FIELD_TYPES.find((fieldType) => fieldType === raw.type);
  const resolvedType = type ?? 'text';
  const mapsTo =
    FORM_FIELD_TARGETS.find((target) => target === raw.mapsTo) ??
    defaultTargetForType(resolvedType);
  const options = Array.isArray(raw.options)
    ? [
        ...new Set(
          raw.options
            .map((option) => readString(option).slice(0, MAX_OPTION_CHARACTERS))
            .filter((option) => option.length > 0),
        ),
      ].slice(0, MAX_OPTIONS)
    : [];

  return {
    key,
    label,
    type:
      resolvedType === 'select' && options.length === 0 ? 'text' : resolvedType,
    required: raw.required === true,
    mapsTo,
    options: resolvedType === 'select' ? options : [],
    placeholder:
      readString(raw.placeholder).slice(0, MAX_LABEL_CHARACTERS) || null,
  };
};

export type StoredFormFields = { fields: FormField[] };

export const toStoredFormFields = (fields: FormField[]): StoredFormFields => ({
  fields,
});

const readFieldList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  const fields = (value as { fields?: unknown } | null)?.fields;

  return Array.isArray(fields) ? fields : [];
};

// The fields live in a JSON column people can edit, so anything malformed is
// dropped rather than breaking the public form.
export const parseFormFields = (value: unknown): FormField[] => {
  const fields: FormField[] = [];
  const seenKeys = new Set<string>();

  for (const item of readFieldList(value)) {
    const field = parseField(item);

    if (!field || seenKeys.has(field.key)) {
      continue;
    }

    seenKeys.add(field.key);
    fields.push(field);

    if (fields.length >= MAX_FORM_FIELDS) {
      break;
    }
  }

  return fields;
};

export const hasContactField = (fields: FormField[]): boolean =>
  fields.some(
    (field) =>
      field.mapsTo === 'person.email' || field.mapsTo === 'person.phone',
  );
