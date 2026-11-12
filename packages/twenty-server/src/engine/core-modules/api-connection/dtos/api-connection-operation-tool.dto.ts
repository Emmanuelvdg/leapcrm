import { Field, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

@ObjectType('ApiConnectionOperationTool')
export class ApiConnectionOperationToolDTO {
  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  method: string;

  @Field()
  path: string;

  @Field(() => GraphQLJSON)
  inputSchema: object;
}
