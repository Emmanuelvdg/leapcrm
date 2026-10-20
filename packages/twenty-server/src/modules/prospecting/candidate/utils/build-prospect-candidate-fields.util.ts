import { type LinksMetadata } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import {
  type CandidateSource,
  type DiscoveredCompany,
} from 'src/modules/prospecting/candidate/types/discovered-company.type';
import { type CompanyIdentity } from 'src/modules/prospecting/identity-resolution/utils/build-company-identity.util';
import { type CompanyIdentityMatch } from 'src/modules/prospecting/identity-resolution/utils/match-company-identity.util';
import { type ProspectCandidateWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospect-candidate.workspace-entity';
import { type ProspectCandidateLifecycleStage } from 'src/modules/prospecting/types/prospect-candidate-lifecycle-stage.type';

export type ProspectCandidateFields = Pick<
  ProspectCandidateWorkspaceEntity,
  | 'name'
  | 'domain'
  | 'registrationNumber'
  | 'registrationAuthority'
  | 'lei'
  | 'country'
  | 'region'
  | 'industry'
  | 'industryCode'
  | 'employeeCount'
  | 'description'
  | 'sources'
  | 'matchStatus'
  | 'matchedCompanyId'
>;

export type NewProspectCandidate = ProspectCandidateFields & {
  id: string;
  campaignId: string;
  identityKey: string;
  lifecycleStage: ProspectCandidateLifecycleStage;
};

const buildDomainLink = (domain: string | null): LinksMetadata => ({
  primaryLinkUrl: isDefined(domain) ? `https://${domain}` : '',
  primaryLinkLabel: '',
  secondaryLinks: null,
});

const formatIndustryCode = (discoveredCompany: DiscoveredCompany) => {
  const { industryCode } = discoveredCompany.record;

  return isDefined(industryCode)
    ? `${industryCode.scheme} ${industryCode.code}`
    : null;
};

const getSourceKey = (
  source: Pick<CandidateSource, 'providerId' | 'externalId'>,
) => `${source.providerId}:${source.externalId}`;

export const buildNewProspectCandidate = ({
  id,
  campaignId,
  discoveredCompany,
  identity,
  identityKey,
  companyMatch,
  lifecycleStage,
}: {
  id: string;
  campaignId: string;
  discoveredCompany: DiscoveredCompany;
  identity: CompanyIdentity;
  identityKey: string;
  companyMatch: CompanyIdentityMatch;
  lifecycleStage: ProspectCandidateLifecycleStage;
}): NewProspectCandidate => {
  const { record } = discoveredCompany;

  return {
    id,
    campaignId,
    identityKey,
    lifecycleStage,
    name: record.name,
    domain: buildDomainLink(identity.domain),
    registrationNumber: identity.registration?.number ?? null,
    registrationAuthority: identity.registration?.authority ?? null,
    lei: identity.lei,
    country: identity.countryCode ?? record.countryCode,
    region: record.region,
    industry: record.industry,
    industryCode: formatIndustryCode(discoveredCompany),
    employeeCount: record.employeeCount,
    description: record.description,
    sources: discoveredCompany.sources,
    matchStatus: companyMatch.status,
    matchedCompanyId:
      companyMatch.status === 'CONFIRMED_MATCH' ||
      companyMatch.status === 'PROBABLE_MATCH'
        ? companyMatch.matchedId
        : null,
  };
};

// Adds what the new source knows and the candidate does not; never replaces
// a value, because a user may have corrected it.
export const buildProspectCandidateMergeUpdate = ({
  candidate,
  discoveredCompany,
  identity,
  companyMatch,
}: {
  candidate: ProspectCandidateWorkspaceEntity;
  discoveredCompany: DiscoveredCompany;
  identity: CompanyIdentity;
  companyMatch: CompanyIdentityMatch;
}): Partial<ProspectCandidateFields> => {
  const { record } = discoveredCompany;
  const update: Partial<ProspectCandidateFields> = {};

  if (!isDefined(candidate.lei) && isDefined(identity.lei)) {
    update.lei = identity.lei;
  }

  if (
    !isDefined(candidate.registrationNumber) &&
    !isDefined(candidate.registrationAuthority) &&
    isDefined(identity.registration)
  ) {
    update.registrationAuthority = identity.registration.authority;
    update.registrationNumber = identity.registration.number;
  }

  if (!candidate.domain?.primaryLinkUrl && isDefined(identity.domain)) {
    update.domain = buildDomainLink(identity.domain);
  }

  if (!isDefined(candidate.country) && isDefined(identity.countryCode)) {
    update.country = identity.countryCode;
  }

  if (!isDefined(candidate.region) && isDefined(record.region)) {
    update.region = record.region;
  }

  if (!isDefined(candidate.industry) && isDefined(record.industry)) {
    update.industry = record.industry;
  }

  const industryCode = formatIndustryCode(discoveredCompany);

  if (!isDefined(candidate.industryCode) && isDefined(industryCode)) {
    update.industryCode = industryCode;
  }

  if (!isDefined(candidate.employeeCount) && isDefined(record.employeeCount)) {
    update.employeeCount = record.employeeCount;
  }

  if (!isDefined(candidate.description) && isDefined(record.description)) {
    update.description = record.description;
  }

  if (
    !isDefined(candidate.matchedCompanyId) &&
    companyMatch.status === 'CONFIRMED_MATCH'
  ) {
    update.matchedCompanyId = companyMatch.matchedId;
    update.matchStatus = companyMatch.status;
  }

  const existingSources = candidate.sources ?? [];
  const existingSourceKeys = new Set(existingSources.map(getSourceKey));
  const newSources = discoveredCompany.sources.filter(
    (source) => !existingSourceKeys.has(getSourceKey(source)),
  );

  if (newSources.length > 0) {
    update.sources = [...existingSources, ...newSources];
  }

  return update;
};
