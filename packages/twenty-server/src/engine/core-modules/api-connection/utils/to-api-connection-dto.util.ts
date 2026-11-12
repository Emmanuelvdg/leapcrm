import { isDefined } from 'twenty-shared/utils';

import { type ApiConnectionDTO } from 'src/engine/core-modules/api-connection/dtos/api-connection.dto';
import { type ApiConnectionEntity } from 'src/engine/core-modules/api-connection/entities/api-connection.entity';

export const toApiConnectionDTO = ({
  secret,
  workspace: _workspace,
  ...connection
}: ApiConnectionEntity): ApiConnectionDTO => ({
  ...connection,
  hasSecret: isDefined(secret),
});
