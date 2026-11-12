import { Field, InputType } from '@nestjs/graphql';

import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { ApiConnectionAuthType } from 'src/engine/core-modules/api-connection/enums/api-connection-auth-type.enum';

@InputType()
export class UpdateApiConnectionInput {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  id: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Field(() => String, { nullable: true })
  name?: string;

  @IsUrl({ require_tld: false, require_protocol: true })
  @IsOptional()
  @Field(() => String, { nullable: true })
  baseUrl?: string;

  @IsEnum(ApiConnectionAuthType)
  @IsOptional()
  @Field(() => ApiConnectionAuthType, { nullable: true })
  authType?: ApiConnectionAuthType;

  @IsString()
  @IsOptional()
  @Field(() => String, { nullable: true })
  authHeaderName?: string | null;

  // Write-only: omitted or empty keeps the stored key.
  @IsString()
  @IsOptional()
  @Field(() => String, { nullable: true })
  secret?: string | null;

  @IsObject()
  @IsOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  defaultHeaders?: Record<string, string>;

  @IsOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  operations?: unknown;

  @IsString()
  @IsOptional()
  @Field(() => String, { nullable: true })
  testOperationName?: string | null;

  @IsObject()
  @IsOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  testArguments?: Record<string, unknown> | null;

  @IsUrl({ require_tld: false, require_protocol: true })
  @IsOptional()
  @Field(() => String, { nullable: true })
  openApiSpecUrl?: string | null;
}
