// Normalised company facts from one provider response. Fields a provider
// does not return stay null; nothing is estimated.
export type CompanyDiscoveryRecord = {
  providerId: string;
  externalId: string;
  sourceUrl: string | null;
  licenceId: string;
  retrievedAt: string;
  name: string;
  domain: string | null;
  countryCode: string | null;
  region: string | null;
  // GLEIF registration authority code (for example RA000523 for Singapore
  // ACRA), shared by every provider so ids from different registries never
  // collide.
  registrationAuthority: string | null;
  registrationNumber: string | null;
  lei: string | null;
  industry: string | null;
  industryCode: { scheme: string; code: string } | null;
  employeeCount: number | null;
  description: string | null;
};
