import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SendWhatsappMessageOutput')
export class SendWhatsappMessageOutputDTO {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => String, { nullable: true })
  conversationId?: string;

  @Field(() => String, { nullable: true })
  messageId?: string;
}
