import { normalizeCompanyDomain } from 'src/modules/prospecting/identity-resolution/utils/normalize-company-domain.util';
import { normalizeCompanyName } from 'src/modules/prospecting/identity-resolution/utils/normalize-company-name.util';
import { normalizeCountryCode } from 'src/modules/prospecting/identity-resolution/utils/normalize-country-code.util';
import { normalizeLei } from 'src/modules/prospecting/identity-resolution/utils/normalize-lei.util';
import {
  type NormalizedRegistration,
  normalizeRegistrationNumber,
} from 'src/modules/prospecting/identity-resolution/utils/normalize-registration-number.util';

export type CompanyIdentity = {
  lei: string | null;
  registration: NormalizedRegistration | null;
  domain: string | null;
  countryCode: string | null;
  normalizedName: string | null;
};

export const buildCompanyIdentity = ({
  name,
  lei,
  registrationAuthority,
  registrationNumber,
  domain,
  country,
}: {
  name: string | null | undefined;
  lei?: string | null;
  registrationAuthority?: string | null;
  registrationNumber?: string | null;
  domain?: string | null;
  country?: string | null;
}): CompanyIdentity => {
  const countryCode = normalizeCountryCode(country);

  return {
    lei: normalizeLei(lei),
    registration: normalizeRegistrationNumber({
      authority: registrationAuthority,
      registrationNumber,
    }),
    domain: normalizeCompanyDomain(domain),
    countryCode,
    normalizedName: normalizeCompanyName({ name, countryCode }),
  };
};
