import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('SeatPrice')
export class SeatPriceDto {
  @Field(() => Int)
  unitAmountCents: number;

  @Field()
  currency: string;

  @Field()
  interval: string;

  @Field(() => Int, { nullable: true })
  firstPeriodUnitAmountCents: number | null;

  @Field()
  isSyncedWithStripe: boolean;
}
