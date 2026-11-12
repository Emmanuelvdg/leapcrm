import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ApiConnectionAuthType } from 'src/engine/core-modules/api-connection/enums/api-connection-auth-type.enum';
import { ApiConnectionStatus } from 'src/engine/core-modules/api-connection/enums/api-connection-status.enum';
import { type ApiConnectionOperation } from 'src/engine/core-modules/api-connection/types/api-connection-operation.type';
import { type EncryptedString } from 'src/engine/core-modules/secret-encryption/branded-strings/encrypted-string.type';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

// Workspace-scoped like mcpServerConnection: a user configures an arbitrary
// REST API directly, with no installed Application behind it.
@Index('IDX_API_CONNECTION_WORKSPACE_ID', ['workspaceId'])
@Entity({ name: 'apiConnection', schema: 'core' })
@Check(
  'CHK_apiConnection_secret_encrypted',
  `"secret" IS NULL OR "secret" LIKE 'enc:v2:%'`,
)
export class ApiConnectionEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: false })
  baseUrl: string;

  @Column({
    type: 'varchar',
    nullable: false,
    default: ApiConnectionAuthType.BEARER,
  })
  authType: ApiConnectionAuthType;

  @Column({ type: 'varchar', nullable: true })
  authHeaderName: string | null;

  @Column({ type: 'varchar', nullable: true })
  secret: EncryptedString | null;

  @Column({ type: 'jsonb', nullable: false, default: {} })
  defaultHeaders: Record<string, string>;

  @Column({ type: 'jsonb', nullable: false, default: [] })
  operations: ApiConnectionOperation[];

  @Column({ type: 'varchar', nullable: true })
  testOperationName: string | null;

  @Column({ type: 'jsonb', nullable: true })
  testArguments: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  openApiSpecUrl: string | null;

  @Column({
    type: 'varchar',
    nullable: false,
    default: ApiConnectionStatus.PENDING,
  })
  status: ApiConnectionStatus;

  @Column({ type: 'varchar', nullable: true })
  lastErrorMessage: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastTestedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
