import { type CompanyIdentity } from 'src/modules/prospecting/identity-resolution/utils/build-company-identity.util';

// The strongest identifier wins so the same company found again through any
// source lands on the same key. Without an identifier, the key includes the
// source record, so two unrelated companies sharing a name never collide on
// the unique (campaign, identityKey) index; the matcher flags them instead.
export const buildCompanyIdentityKey = ({
  identity,
  providerId,
  externalId,
}: {
  identity: CompanyIdentity;
  providerId: string;
  externalId: string;
}): string => {
  if (identity.lei !== null) {
    return `lei:${identity.lei}`;
  }

  if (identity.registration !== null) {
    return `reg:${identity.registration.authority}:${identity.registration.number}`;
  }

  if (identity.domain !== null) {
    return identity.countryCode !== null
      ? `domain:${identity.countryCode}:${identity.domain}`
      : `domain:${identity.domain}`;
  }

  return `source:${providerId}:${externalId}`;
};
