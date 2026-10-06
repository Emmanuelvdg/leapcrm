import { type CoreApiClient } from 'twenty-client-sdk/core';

import { scanAllCompanies } from 'src/utils/company-hygiene';
import { scanAllPeople } from 'src/utils/person-hygiene';

export const scanAllRecords = async (
  client: CoreApiClient,
): Promise<{
  companies: { scannedCount: number; updatedCount: number };
  people: { scannedCount: number; updatedCount: number };
}> => ({
  companies: await scanAllCompanies(client),
  people: await scanAllPeople(client),
});
