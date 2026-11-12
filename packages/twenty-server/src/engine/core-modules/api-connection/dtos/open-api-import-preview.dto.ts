import { Field, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

import { type ApiConnectionOperation } from 'src/engine/core-modules/api-connection/types/api-connection-operation.type';

@ObjectType('OpenApiImportPreview')
export class OpenApiImportPreviewDTO {
  @Field(() => GraphQLJSON)
  operations: ApiConnectionOperation[];

  @Field(() => [String])
  skipped: string[];

  @Field(() => String, { nullable: true })
  suggestedBaseUrl: string | null;
}
