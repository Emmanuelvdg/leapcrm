import { Field, InputType } from '@nestjs/graphql';

import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

import { ApiConnectionAuthType } from 'src/engine/core-modules/api-connection/enums/api-connection-auth-type.enum';

@InputType()
export class CreateApiConnectionInput {
  @IsString()
  @IsNotEmpty()
  @Field()
  name: string;

  @IsUrl({ require_tld: false, require_protocol: true })
  @Field()
  baseUrl: string;

  @IsEnum(ApiConnectionAuthType)
  @Field(() => ApiConnectionAuthType)
  authType: ApiConnectionAuthType;

  @IsString()
  @IsOptional()
  @Field(() => String, { nullable: true })
  authHeaderName?: string | null;

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
