import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SubscriptionCheckoutSession')
export class CheckoutSessionDto {
  @Field()
  url: string;
}
