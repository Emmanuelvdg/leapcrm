// Already normalised by the caller (identity resolution owns normalisation).
export type GlobalCompanyValues = {
  name: string;
  normalizedName: string | null;
  countryCode: string | null;
  region: string | null;
  canonicalDomain: string | null;
  lei: string | null;
  registrationAuthority: string | null;
  registrationNumber: string | null;
  industry: string | null;
  industryCode: string | null;
  industryCodeScheme: string | null;
  employeeCount: number | null;
  description: string | null;
};

export type PublicCompanyObservation = {
  providerId: string;
  externalId: string;
  sourceUrl: string | null;
  licenceId: string;
  retrievedAt: Date;
  sourceRank: number;
  values: GlobalCompanyValues;
};
