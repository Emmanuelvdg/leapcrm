// Internal stage id for reading the shared directory. It only ever appears in
// core job rows, never on tenant records: directory candidates are credited
// to their original public sources.
export const DIRECTORY_DISCOVERY_STAGE_ID = 'internal-directory';

export type DiscoveryStage = {
  providerId: string;
  countryCode: string | null;
};

// The directory is read first for every market so providers are only called
// for what it does not already hold; providers then run in their selection
// order, one market at a time.
export const buildDiscoveryStages = ({
  countryCodes,
  providerIds,
}: {
  countryCodes: string[];
  providerIds: string[];
}): DiscoveryStage[] => {
  const markets = countryCodes.length > 0 ? countryCodes : [null];

  return [DIRECTORY_DISCOVERY_STAGE_ID, ...providerIds].flatMap((providerId) =>
    markets.map((countryCode) => ({ providerId, countryCode })),
  );
};

export const isSameDiscoveryStage = (
  first: DiscoveryStage,
  second: DiscoveryStage,
): boolean =>
  first.providerId === second.providerId &&
  first.countryCode === second.countryCode;
