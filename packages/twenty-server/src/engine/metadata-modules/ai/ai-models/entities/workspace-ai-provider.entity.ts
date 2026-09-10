import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { type EncryptedString } from 'src/engine/core-modules/secret-encryption/branded-strings/encrypted-string.type';
import { type AiProviderModelConfig } from 'src/engine/metadata-modules/ai/ai-models/types/ai-provider-model-config.type';
import { type AiSdkPackage } from 'twenty-shared/ai';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

@Entity({ name: 'workspaceAiProvider', schema: 'core' })
@Index('IDX_WORKSPACE_AI_PROVIDER_WORKSPACE_ID_PROVIDER_NAME_UNIQUE', [
  'workspaceId',
  'providerName',
], { unique: true })
@Check(
  'CHK_workspaceAiProvider_apiKey_encrypted',
  `"apiKey" IS NULL OR "apiKey" LIKE 'enc:v2:%'`,
)
export class WorkspaceAiProviderEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: false })
  providerName: string;

  @Column({ type: 'text', nullable: false })
  npm: AiSdkPackage;

  @Column({ type: 'text', nullable: false })
  label: string;

  @Column({ type: 'text', nullable: true })
  baseUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  apiKey: EncryptedString | null;

  @Column({ type: 'jsonb', nullable: false, default: '[]' })
  models: AiProviderModelConfig[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
