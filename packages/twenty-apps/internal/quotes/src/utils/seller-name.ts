import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import { type QuoteSettings } from 'src/utils/quote-settings';

// Without a seller name in the app settings the quote carries the workspace
// name, which is usually the company name.
export const getSellerName = async (
  settings: QuoteSettings,
): Promise<string> => {
  if (settings.sellerName) {
    return settings.sellerName;
  }

  try {
    const { currentWorkspace } = await new MetadataApiClient().query({
      currentWorkspace: { displayName: true },
    });

    return (
      (currentWorkspace as { displayName: string | null } | null)
        ?.displayName || 'Quotation'
    );
  } catch {
    return 'Quotation';
  }
};
