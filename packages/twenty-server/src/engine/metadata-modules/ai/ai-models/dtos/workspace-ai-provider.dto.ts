import { Field, HideField, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('WorkspaceAiProvider')
export class WorkspaceAiProviderDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field()
  providerName: string;

  @Field()
  npm: string;

  @Field()
  label: string;

  @Field({ nullable: true })
  baseUrl?: string;

  @Field()
  hasApiKey: boolean;

  @Field(() => GraphQLJSON)
  models: object[];

  @HideField()
  workspaceId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
