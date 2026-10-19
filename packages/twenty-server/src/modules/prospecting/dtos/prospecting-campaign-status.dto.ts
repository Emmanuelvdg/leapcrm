import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProspectingCampaignStatusDTO {
  @Field(() => String)
  campaignId: string;

  @Field(() => String)
  status: string;
}
