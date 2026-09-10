import { Field, InputType, Int } from '@nestjs/graphql';

import { IsInt, Min } from 'class-validator';

@InputType()
export class UpdateSubscriptionSeatsInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  seats: number;
}
