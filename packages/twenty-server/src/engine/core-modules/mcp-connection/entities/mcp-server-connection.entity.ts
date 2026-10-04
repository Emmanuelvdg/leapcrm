import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { McpServerConnectionAuthMethod } from 'src/engine/core-modules/mcp-connection/enums/mcp-server-connection-auth-method.enum';
import { McpServerConnectionStatus } from 'src/engine/core-modules/mcp-connection/enums/mcp-server-connection-status.enum';
import { type EncryptedString } from 'src/engine/core-modules/secret-encryption/branded-strings/encrypted-string.type';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

// Workspace-scoped, not per-Application — a user connects an arbitrary
// external MCP server directly, with no installed marketplace Application in
// the loop, so this deliberately does NOT extend SyncableEntity (which would
// force an applicationId FK and the flat-entity/migration sync system that
// comes with it). WorkspaceRelatedEntity gives us workspaceId + cascade
// delete without that baggage.
@Index('IDX_MCP_SERVER_CONNECTION_WORKSPACE_ID', ['workspaceId'])
@Entity({ name: 'mcpServerConnection', schema: 'core' })
@Check(
  'CHK_mcpServerConnection_clientSecret_encrypted',
  `"clientSecret" IS NULL OR "clientSecret" LIKE 'enc:v2:%'`,
)
@Check(
  'CHK_mcpServerConnection_accessToken_encrypted',
  `"accessToken" IS NULL OR "accessToken" LIKE 'enc:v2:%'`,
)
@Check(
  'CHK_mcpServerConnection_refreshToken_encrypted',
  `"refreshToken" IS NULL OR "refreshToken" LIKE 'enc:v2:%'`,
)
export class McpServerConnectionEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: false })
  serverUrl: string;

  // API_KEY connections store the static key in `accessToken` (encrypted) and
  // skip the whole OAuth flow, discovery and refresh.
  @Column({
    type: 'varchar',
    nullable: false,
    default: McpServerConnectionAuthMethod.OAUTH,
  })
  authMethod: McpServerConnectionAuthMethod;

  // Discovered (or manually supplied, see below) OAuth endpoints. Nullable
  // until discovery has run at least once.
  @Column({ type: 'varchar', nullable: true })
  authorizationEndpoint: string | null;

  @Column({ type: 'varchar', nullable: true })
  tokenEndpoint: string | null;

  // Absent when the authorization server doesn't support RFC 7591 dynamic
  // client registration — those servers require clientId/clientSecret to be
  // supplied manually instead (see manualOverrides below).
  @Column({ type: 'varchar', nullable: true })
  registrationEndpoint: string | null;

  // True when authorizationEndpoint/tokenEndpoint/clientId were supplied by
  // the user at creation time rather than discovered — discovery and DCR are
  // skipped entirely for these connections.
  @Column({ type: 'boolean', nullable: false, default: false })
  usesManualOverrides: boolean;

  @Column({ type: 'varchar', nullable: true })
  clientId: string | null;

  @Column({ type: 'varchar', nullable: true })
  clientSecret: EncryptedString | null;

  @Column({ type: 'varchar', nullable: true })
  accessToken: EncryptedString | null;

  @Column({ type: 'varchar', nullable: true })
  refreshToken: EncryptedString | null;

  @Column({ type: 'timestamptz', nullable: true })
  tokenExpiresAt: Date | null;

  // Space-delimited, matching the OAuth `scope` request/response parameter
  // convention directly rather than splitting into an array.
  @Column({ type: 'varchar', nullable: true })
  scopes: string | null;

  @Column({
    type: 'varchar',
    nullable: false,
    default: McpServerConnectionStatus.PENDING,
  })
  status: McpServerConnectionStatus;

  @Column({ type: 'varchar', nullable: true })
  lastErrorMessage: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
