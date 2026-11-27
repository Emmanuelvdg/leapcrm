export const FORM_FIELD_TYPES = [
  'text',
  'email',
  'phone',
  'textarea',
  'select',
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const FORM_FIELD_TARGETS = [
  'person.fullName',
  'person.firstName',
  'person.lastName',
  'person.email',
  'person.phone',
  'person.jobTitle',
  'company.name',
  'note',
] as const;

export type FormFieldTarget = (typeof FORM_FIELD_TARGETS)[number];

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Short text',
  email: 'Email',
  phone: 'Phone',
  textarea: 'Long text',
  select: 'Drop-down',
};

export const FORM_FIELD_TARGET_LABELS: Record<FormFieldTarget, string> = {
  'person.fullName': 'Contact: full name',
  'person.firstName': 'Contact: first name',
  'person.lastName': 'Contact: last name',
  'person.email': 'Contact: email',
  'person.phone': 'Contact: phone',
  'person.jobTitle': 'Contact: job title',
  'company.name': 'Company: name',
  note: 'Note only',
};

export type FormField = {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  mapsTo: FormFieldTarget;
  options: string[];
  placeholder: string | null;
};

export const DEFAULT_FORM_FIELDS: FormField[] = [
  {
    key: 'full_name',
    label: 'Full name',
    type: 'text',
    required: true,
    mapsTo: 'person.fullName',
    options: [],
    placeholder: null,
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: false,
    mapsTo: 'person.email',
    options: [],
    placeholder: 'name@company.com',
  },
  {
    key: 'phone',
    label: 'Phone / WhatsApp',
    type: 'phone',
    required: true,
    mapsTo: 'person.phone',
    options: [],
    placeholder: '+91 98765 43210',
  },
  {
    key: 'company',
    label: 'Company',
    type: 'text',
    required: false,
    mapsTo: 'company.name',
    options: [],
    placeholder: null,
  },
  {
    key: 'message',
    label: 'How can we help?',
    type: 'textarea',
    required: false,
    mapsTo: 'note',
    options: [],
    placeholder: null,
  },
];
