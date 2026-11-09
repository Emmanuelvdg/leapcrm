import { Field, ObjectType } from '@nestjs/graphql';

import { GraphQLJSON } from 'graphql-type-json';
import { type IcpCriterion } from 'twenty-shared/icp-analysis';

@ObjectType()
export class IcpSuggestedCriteriaDTO {
  @Field(() => String)
  modelId: string;

  @Field(() => [GraphQLJSON])
  criteria: IcpCriterion[];
}
