import { Field, HideField, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { ApiConnectionAuthType } from 'src/engine/core-modules/api-connection/enums/api-connection-auth-type.enum';
import { ApiConnectionStatus } from 'src/engine/core-modules/api-connection/enums/api-connection-status.enum';
import { type ApiConnectionOperation } from 'src/engine/core-modules/api-connection/types/api-connection-operation.type';

@ObjectType('ApiConnection')
export class ApiConnectionDTO {
  @Field(() => UUIDScalarType)
  id: string;

  @Field()
  name: string;

  @Field()
  baseUrl: string;

  @Field(() => ApiConnectionAuthType)
  authType: ApiConnectionAuthType;

  @Field(() => String, { nullable: true })
  authHeaderName: string | null;

  @Field()
  hasSecret: boolean;

  @Field(() => GraphQLJSON)
  defaultHeaders: Record<string, string>;

  @Field(() => GraphQLJSON)
  operations: ApiConnectionOperation[];

  @Field(() => String, { nullable: true })
  testOperationName: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  testArguments: Record<string, unknown> | null;

  @Field(() => String, { nullable: true })
  openApiSpecUrl: string | null;

  @Field(() => ApiConnectionStatus)
  status: ApiConnectionStatus;

  @Field(() => String, { nullable: true })
  lastErrorMessage: string | null;

  @Field(() => Date, { nullable: true })
  lastTestedAt: Date | null;

  @HideField()
  workspaceId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
