import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SendWhatsappMessageInput {
  @Field(() => String)
  body: string;

  @Field(() => String, { nullable: true })
  conversationId?: string;

  @Field(() => String, { nullable: true })
  personId?: string;
}
