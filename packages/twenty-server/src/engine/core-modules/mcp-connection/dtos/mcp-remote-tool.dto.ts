import { Field, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

@ObjectType('McpRemoteTool')
export class McpRemoteToolDTO {
  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  inputSchema: object | null;
}
