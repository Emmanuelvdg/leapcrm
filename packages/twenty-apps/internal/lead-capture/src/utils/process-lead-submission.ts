import { type CoreApiClient } from 'twenty-client-sdk/core';

import { buildSubmissionNote } from 'src/utils/build-submission-note';
import { type LeadForm } from 'src/utils/fetch-lead-form';
import { type LeadCaptureSettings } from 'src/utils/get-lead-capture-settings';
import {
  createCompany,
  createDeal,
  createNote,
  createPerson,
  createSubmission,
  findCompanyByDomain,
  findCompanyByName,
  findOpenDealId,
  findPersonByEmail,
  findPersonByPhone,
  type PersonRecord,
  updatePerson,
} from 'src/utils/lead-records';
import {
  describeLead,
  getBusinessEmailDomain,
  type MappedLead,
} from 'src/utils/map-answers';
import { type SubmissionMeta } from 'src/utils/parse-submission';
import { parsePhoneInput, type PhoneInput } from 'src/utils/phone-number';

export type SubmissionOutcome = 'NEW_CONTACT' | 'EXISTING_CONTACT';

export type ProcessedSubmission = {
  submissionId: string;
  personId: string;
  opportunityId: string | null;
  outcome: SubmissionOutcome;
  problems: string[];
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isPhoneError = (error: unknown): boolean =>
  /phone|calling code|country code/i.test(errorMessage(error));

const isStageError = (error: unknown): boolean =>
  /stage|enum|option/i.test(errorMessage(error));

const findExistingPerson = async (
  client: CoreApiClient,
  mapped: MappedLead,
  phone: PhoneInput | undefined,
): Promise<PersonRecord | undefined> => {
  if (mapped.email) {
    const byEmail = await findPersonByEmail(client, mapped.email);

    if (byEmail) {
      return byEmail;
    }
  }

  return phone
    ? findPersonByPhone(client, phone.internationalDigits)
    : undefined;
};

const resolveCompanyId = async (
  client: CoreApiClient,
  mapped: MappedLead,
): Promise<string | null> => {
  const domain = getBusinessEmailDomain(mapped.email);

  if (mapped.companyName) {
    return (
      (await findCompanyByName(client, mapped.companyName)) ??
      (domain ? await findCompanyByDomain(client, domain) : undefined) ??
      (await createCompany(client, { name: mapped.companyName, domain }))
    );
  }

  // A business email links an existing company, but never creates one from
  // the domain alone: the company name would be a guess.
  return domain ? ((await findCompanyByDomain(client, domain)) ?? null) : null;
};

const leadSourceFields = (form: LeadForm, meta: SubmissionMeta) => ({
  leadSource: meta.utmSource ?? form.leadSource,
  leadSourceMedium: meta.utmMedium,
  leadSourceCampaign: meta.utmCampaign,
});

// The user chose "fill blanks only": an existing contact keeps every value it
// already has, and only empty fields are filled from the form.
export const buildFillBlanksPatch = ({
  person,
  mapped,
  phone,
  companyId,
  sourceFields,
}: {
  person: PersonRecord;
  mapped: MappedLead;
  phone: PhoneInput | undefined;
  companyId: string | null;
  sourceFields: ReturnType<typeof leadSourceFields>;
}): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  const hasName = Boolean(person.name?.firstName || person.name?.lastName);

  if (!hasName && (mapped.firstName || mapped.lastName)) {
    patch.name = {
      firstName: mapped.firstName ?? '',
      lastName: mapped.lastName ?? '',
    };
  }

  if (!person.emails?.primaryEmail && mapped.email) {
    patch.emails = {
      primaryEmail: mapped.email,
      additionalEmails: person.emails?.additionalEmails ?? null,
    };
  }

  if (!person.phones?.primaryPhoneNumber && phone) {
    patch.phones = {
      ...phone.apiValue,
      additionalPhones: person.phones?.additionalPhones ?? null,
    };
  }

  if (!person.jobTitle && mapped.jobTitle) {
    patch.jobTitle = mapped.jobTitle;
  }

  if (!person.companyId && companyId) {
    patch.companyId = companyId;
  }

  // First touch wins: the source that first brought the contact in is kept.
  if (
    !person.leadSource &&
    !person.leadSourceMedium &&
    !person.leadSourceCampaign
  ) {
    Object.assign(patch, sourceFields);
  }

  return patch;
};

const saveWithPhoneFallback = async ({
  data,
  save,
  problems,
  phoneText,
}: {
  data: Record<string, unknown>;
  save: (data: Record<string, unknown>) => Promise<string | void>;
  problems: string[];
  phoneText: string | null;
}): Promise<string | void> => {
  try {
    return await save(data);
  } catch (error) {
    if (!('phones' in data) || !isPhoneError(error)) {
      throw error;
    }

    problems.push(
      `The phone number "${phoneText}" could not be saved on the contact, so it is kept in this note.`,
    );

    const { phones: _phones, ...dataWithoutPhone } = data;

    return save(dataWithoutPhone);
  }
};

const resolveDeal = async ({
  client,
  form,
  personId,
  companyId,
  mapped,
  settings,
  problems,
}: {
  client: CoreApiClient;
  form: LeadForm;
  personId: string;
  companyId: string | null;
  mapped: MappedLead;
  settings: LeadCaptureSettings;
  problems: string[];
}): Promise<string | null> => {
  if (!form.createDeal) {
    return null;
  }

  // A contact who writes in again while a deal is open is the same enquiry,
  // not a new deal.
  const openDealId = await findOpenDealId(
    client,
    personId,
    settings.closedStages,
  );

  if (openDealId) {
    return openDealId;
  }

  const dealData: Record<string, unknown> = {
    name: `${mapped.companyName ?? describeLead(mapped)} – ${form.name}`,
    pointOfContactId: personId,
    ...(companyId ? { companyId } : {}),
    ...(form.dealOwnerId ? { ownerId: form.dealOwnerId } : {}),
    ...(form.dealStage ? { stage: form.dealStage } : {}),
  };

  try {
    return await createDeal(client, dealData);
  } catch (error) {
    if (!form.dealStage || !isStageError(error)) {
      throw error;
    }

    problems.push(
      `The form's deal stage "${form.dealStage}" does not exist, so the deal starts in the first stage.`,
    );

    const { stage: _stage, ...dataWithoutStage } = dealData;

    return createDeal(client, dataWithoutStage);
  }
};

export const processLeadSubmission = async ({
  client,
  form,
  mapped,
  answers,
  meta,
  visitorHash,
  userAgent,
  settings,
}: {
  client: CoreApiClient;
  form: LeadForm;
  mapped: MappedLead;
  answers: Record<string, string>;
  meta: SubmissionMeta;
  visitorHash: string | null;
  userAgent: string | null;
  settings: LeadCaptureSettings;
}): Promise<ProcessedSubmission> => {
  const problems: string[] = [];
  const phone = mapped.phone
    ? parsePhoneInput(mapped.phone, settings.defaultPhoneCountry)
    : undefined;
  const existingPerson = await findExistingPerson(client, mapped, phone);
  const companyId = await resolveCompanyId(client, mapped);
  const sourceFields = leadSourceFields(form, meta);

  let personId: string;

  if (existingPerson) {
    personId = existingPerson.id;

    const patch = buildFillBlanksPatch({
      person: existingPerson,
      mapped,
      phone,
      companyId,
      sourceFields,
    });

    if (Object.keys(patch).length > 0) {
      await saveWithPhoneFallback({
        data: patch,
        save: (data) => updatePerson(client, personId, data),
        problems,
        phoneText: mapped.phone,
      });
    }
  } else {
    personId = (await saveWithPhoneFallback({
      data: {
        name: {
          firstName: mapped.firstName ?? '',
          lastName: mapped.lastName ?? '',
        },
        ...(mapped.email ? { emails: { primaryEmail: mapped.email } } : {}),
        ...(phone ? { phones: phone.apiValue } : {}),
        ...(mapped.jobTitle ? { jobTitle: mapped.jobTitle } : {}),
        ...(companyId ? { companyId } : {}),
        ...sourceFields,
      },
      save: (data) => createPerson(client, data),
      problems,
      phoneText: mapped.phone,
    })) as string;
  }

  const opportunityId = await resolveDeal({
    client,
    form,
    personId,
    companyId,
    mapped,
    settings,
    problems,
  });

  await createNote(client, {
    ...buildSubmissionNote({
      formName: form.name,
      answerList: mapped.answerList,
      meta,
      problems,
    }),
    personId,
    opportunityId,
  });

  const outcome: SubmissionOutcome = existingPerson
    ? 'EXISTING_CONTACT'
    : 'NEW_CONTACT';

  const submissionId = await createSubmission(client, {
    name: `${describeLead(mapped)} via ${form.name}`,
    formId: form.id,
    personId,
    ...(companyId ? { companyId } : {}),
    ...(opportunityId ? { opportunityId } : {}),
    outcome,
    answers,
    utmSource: meta.utmSource,
    utmMedium: meta.utmMedium,
    utmCampaign: meta.utmCampaign,
    utmTerm: meta.utmTerm,
    utmContent: meta.utmContent,
    pageUrl: meta.pageUrl,
    referrer: meta.referrer,
    visitorHash,
    userAgent: userAgent?.slice(0, 500) ?? null,
    problems: problems.length > 0 ? problems.join('\n') : null,
  });

  return { submissionId, personId, opportunityId, outcome, problems };
};
