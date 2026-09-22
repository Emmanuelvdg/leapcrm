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
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

export type WhatsappChannelConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';

// A phone_number_id belongs to exactly one WABA at a time on Meta's side, so it's
// the natural lookup key for the webhook receiver, which only gets metadata.phone_number_id
// and has to resolve back to a workspace with no authenticated request context.
@Entity({ name: 'whatsappChannel', schema: 'core' })
@Index('IDX_WHATSAPP_CHANNEL_PHONE_NUMBER_ID', ['phoneNumberId'], {
  unique: true,
})
@Index('IDX_WHATSAPP_CHANNEL_WORKSPACE_ID', ['workspaceId'])
@Check(
  'CHK_whatsappChannel_accessToken_encrypted',
  `"accessToken" IS NULL OR "accessToken" LIKE 'enc:v2:%'`,
)
export class WhatsappChannelEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: false })
  phoneNumberId: string;

  @Column({ type: 'text', nullable: false })
  wabaId: string;

  @Column({ type: 'text', nullable: true })
  displayPhoneNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  accessToken: EncryptedString | null;

  // Per-channel override of the instance-wide WHATSAPP_WEBHOOK_VERIFY_TOKEN config
  // var; null falls back to the instance-wide value.
  @Column({ type: 'text', nullable: true })
  webhookVerifyToken: string | null;

  @Column({ type: 'varchar', nullable: false, default: 'CONNECTED' })
  connectionStatus: WhatsappChannelConnectionStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
