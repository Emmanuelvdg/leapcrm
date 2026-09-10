import { Field, InputType, Int } from '@nestjs/graphql';

import { IsInt, Min } from 'class-validator';

@InputType()
export class CreateCheckoutSessionInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  seats: number;
}
