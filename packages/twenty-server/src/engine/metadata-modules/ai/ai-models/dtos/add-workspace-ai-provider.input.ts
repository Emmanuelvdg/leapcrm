import { Field, InputType } from '@nestjs/graphql';

import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';
import { AI_SDK_PACKAGES, type AiSdkPackage } from 'twenty-shared/ai';

@InputType()
export class AddWorkspaceAiProviderInput {
  @IsString()
  @IsNotEmpty()
  @Field()
  providerName: string;

  @IsIn(AI_SDK_PACKAGES)
  @Field(() => String)
  npm: AiSdkPackage;

  @IsString()
  @IsNotEmpty()
  @Field()
  label: string;

  @IsString()
  @IsOptional()
  @Field({ nullable: true })
  baseUrl?: string;

  @IsString()
  @IsOptional()
  @Field({ nullable: true })
  apiKey?: string;

  @IsOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  models?: object[];
}
