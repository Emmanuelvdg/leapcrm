import { Field, ObjectType } from '@nestjs/graphql';

import { GraphQLJSON } from 'graphql-type-json';
import {
  type IcpAttributeDefinition,
  type IcpDatasetRow,
} from 'twenty-shared/icp-analysis';

// Read-only: lets the editor back-test against the current deals after a
// reload without saving a new analysis.
@ObjectType()
export class IcpModelEvidenceDTO {
  @Field(() => String)
  modelId: string;

  @Field(() => [GraphQLJSON])
  attributes: IcpAttributeDefinition[];

  @Field(() => [GraphQLJSON])
  rows: IcpDatasetRow[];
}
