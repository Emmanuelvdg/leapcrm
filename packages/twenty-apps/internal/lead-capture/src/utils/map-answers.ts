import { FREE_EMAIL_DOMAINS } from 'src/constants/free-email-domains';
import { type FormField } from 'src/constants/form-field-options';

export type MappedLead = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  companyName: string | null;
  answerList: { label: string; value: string }[];
};

export const splitFullName = (
  fullName: string,
): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
};

export const mapAnswers = (
  fields: FormField[],
  answers: Record<string, string>,
): MappedLead => {
  const mapped: MappedLead = {
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    jobTitle: null,
    companyName: null,
    answerList: [],
  };

  for (const field of fields) {
    const answer = answers[field.key];

    if (!answer) {
      continue;
    }

    mapped.answerList.push({ label: field.label, value: answer });

    switch (field.mapsTo) {
      case 'person.fullName': {
        const { firstName, lastName } = splitFullName(answer);

        mapped.firstName ??= firstName || null;
        mapped.lastName ??= lastName || null;
        break;
      }
      case 'person.firstName':
        mapped.firstName = answer;
        break;
      case 'person.lastName':
        mapped.lastName = answer;
        break;
      case 'person.email':
        mapped.email ??= answer.toLowerCase();
        break;
      case 'person.phone':
        mapped.phone ??= answer;
        break;
      case 'person.jobTitle':
        mapped.jobTitle ??= answer;
        break;
      case 'company.name':
        mapped.companyName ??= answer;
        break;
      case 'note':
        break;
    }
  }

  return mapped;
};

export const getBusinessEmailDomain = (email: string | null): string | null => {
  const domain = email?.split('@')[1]?.trim().toLowerCase();

  return domain && !FREE_EMAIL_DOMAINS.has(domain) ? domain : null;
};

export const describeLead = (mapped: MappedLead): string =>
  [mapped.firstName, mapped.lastName].filter(Boolean).join(' ') ||
  mapped.email ||
  mapped.phone ||
  'Unknown visitor';
