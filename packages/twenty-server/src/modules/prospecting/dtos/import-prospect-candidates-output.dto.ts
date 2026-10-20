import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ImportProspectCandidatesOutputDTO {
  @Field(() => String)
  campaignId: string;

  @Field(() => Int)
  createdCount: number;

  @Field(() => Int)
  mergedCount: number;

  @Field(() => Int)
  candidatesFound: number;
}
