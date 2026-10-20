import { type CompanyDiscoveryRecord } from 'src/modules/prospecting/discovery/types/company-discovery-record.type';

// Provenance shown on a candidate. Always the original public source or the
// customer file, never the internal directory.
export type CandidateSource = {
  providerId: string;
  externalId: string;
  sourceUrl: string | null;
  licenceId: string;
  retrievedAt: string;
};

export type DiscoveredCompany = {
  record: CompanyDiscoveryRecord;
  sources: CandidateSource[];
};

export type WrittenCandidate = {
  candidateId: string;
  outcome: 'CREATED' | 'MERGED';
};
