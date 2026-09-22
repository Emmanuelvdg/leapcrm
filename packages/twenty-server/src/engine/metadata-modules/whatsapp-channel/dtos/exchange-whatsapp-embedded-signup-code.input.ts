import { Field, InputType } from '@nestjs/graphql';

import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class ExchangeWhatsappEmbeddedSignupCodeInput {
  // Short-lived code returned by the FB.login() Embedded Signup callback,
  // exchanged server-side for a long-lived access token.
  @IsString()
  @IsNotEmpty()
  @Field()
  code: string;

  // Comes from the postMessage WA_EMBEDDED_SIGNUP FINISH event, not from FB.login().
  @IsString()
  @IsNotEmpty()
  @Field()
  phoneNumberId: string;

  @IsString()
  @IsNotEmpty()
  @Field()
  wabaId: string;
}
