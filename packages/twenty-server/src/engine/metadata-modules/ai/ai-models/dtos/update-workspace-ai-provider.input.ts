import { Field, InputType } from '@nestjs/graphql';

import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class UpdateWorkspaceAiProviderInput {
  @IsUUID()
  @Field(() => UUIDScalarType)
  id: string;

  @IsString()
  @IsOptional()
  @Field({ nullable: true })
  label?: string;

  @IsString()
  @IsOptional()
  @Field({ nullable: true })
  baseUrl?: string;

  // Omit to leave the stored key unchanged.
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Field({ nullable: true })
  apiKey?: string;

  @IsOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  models?: object[];
}
