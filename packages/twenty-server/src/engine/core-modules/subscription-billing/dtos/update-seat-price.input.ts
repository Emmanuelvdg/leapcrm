import { Field, InputType, Int } from '@nestjs/graphql';

import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

@InputType()
export class UpdateSeatPriceInput {
  @Field(() => Int)
  @IsInt()
  @IsPositive()
  unitAmountCents: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  currency?: string;
}
