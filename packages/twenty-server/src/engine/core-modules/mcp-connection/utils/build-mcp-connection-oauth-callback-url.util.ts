import { ApiPath } from 'twenty-shared/types';

// Workspace-agnostic by design, same as the app-connection OAuth flow: the
// workspace/connection identity travels in the signed `state` parameter, so
// one redirect URI (registered with each MCP server's authorization server,
// whether via DCR or manually) serves every workspace.
export const buildMcpConnectionOAuthCallbackUrl = (serverUrl: string): string =>
  new URL(`/${ApiPath.Auth}/mcp-connections/callback`, serverUrl).toString();
