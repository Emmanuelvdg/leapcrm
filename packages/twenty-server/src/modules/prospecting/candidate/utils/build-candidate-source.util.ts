import { type CandidateSource } from 'src/modules/prospecting/candidate/types/discovered-company.type';
import { type CompanyDiscoveryRecord } from 'src/modules/prospecting/discovery/types/company-discovery-record.type';

export const buildCandidateSource = (
  record: CompanyDiscoveryRecord,
): CandidateSource => ({
  providerId: record.providerId,
  externalId: record.externalId,
  sourceUrl: record.sourceUrl,
  licenceId: record.licenceId,
  retrievedAt: record.retrievedAt,
});
