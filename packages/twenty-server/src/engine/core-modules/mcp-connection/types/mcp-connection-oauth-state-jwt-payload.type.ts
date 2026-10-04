import { type CommonPropertiesJwtPayload } from 'src/engine/core-modules/auth/types/common-properties-jwt-payload.type';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';

export type McpConnectionOAuthStateJwtPayload = CommonPropertiesJwtPayload & {
  type: JwtTokenTypeEnum.MCP_CONNECTION_OAUTH_STATE;
  connectionId: string;
  workspaceId: string;
  userId: string;
  codeVerifier: string | null;
};
