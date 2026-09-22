import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

// Never carries accessToken - see WhatsappChannelService.toDTO(), which mirrors
// WorkspaceAiProviderDTO's toDTO() in never exposing the raw secret.
@ObjectType('WhatsappChannel')
export class WhatsappChannelDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field()
  phoneNumberId: string;

  @Field()
  wabaId: string;

  @Field(() => String, { nullable: true })
  displayPhoneNumber: string | null;

  @Field()
  connectionStatus: string;

  @Field()
  createdAt: Date;
}
