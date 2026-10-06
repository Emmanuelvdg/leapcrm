import { definePostInstallLogicFunction } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { INITIAL_SCAN_POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { scanAllRecords } from 'src/utils/scan-all-records';

const handler = async (): Promise<object> =>
  scanAllRecords(new CoreApiClient());

export default definePostInstallLogicFunction({
  universalIdentifier:
    INITIAL_SCAN_POST_INSTALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'scan-all-records-on-install',
  description:
    'Checks every existing person and company right after installation so the cleanup views are filled in immediately.',
  timeoutSeconds: 300,
  shouldRunOnVersionUpgrade: false,
  handler,
});
