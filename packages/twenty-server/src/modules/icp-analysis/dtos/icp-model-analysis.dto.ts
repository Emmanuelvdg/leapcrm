import { Field, ObjectType } from '@nestjs/graphql';

import { GraphQLJSON } from 'graphql-type-json';
import { type IcpDatasetRow } from 'twenty-shared/icp-analysis';

import { type IcpModelAnalysisSnapshot } from 'src/modules/icp-analysis/types/icp-model-analysis-snapshot.type';

// Rows go back to the browser so the criteria editor can back-test every
// change without another round trip.
@ObjectType()
export class IcpModelAnalysisDTO {
  @Field(() => String)
  modelId: string;

  @Field(() => GraphQLJSON)
  analysis: IcpModelAnalysisSnapshot;

  @Field(() => [GraphQLJSON])
  rows: IcpDatasetRow[];
}
