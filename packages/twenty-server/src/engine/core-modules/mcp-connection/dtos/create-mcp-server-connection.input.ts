import { Field, InputType } from '@nestjs/graphql';

import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

@InputType()
export class McpServerConnectionManualOverridesInput {
  @IsUrl()
  @Field()
  authorizationEndpoint: string;

  @IsUrl()
  @Field()
  tokenEndpoint: string;

  @IsString()
  @IsNotEmpty()
  @Field()
  clientId: string;

  @IsString()
  @IsOptional()
  @Field({ nullable: true })
  clientSecret?: string;
}

@InputType()
export class CreateMcpServerConnectionInput {
  @IsString()
  @IsNotEmpty()
  @Field()
  name: string;

  @IsUrl()
  @Field()
  serverUrl: string;

  @IsOptional()
  @Field(() => McpServerConnectionManualOverridesInput, { nullable: true })
  manualOverrides?: McpServerConnectionManualOverridesInput;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Field({ nullable: true })
  apiKey?: string;
}
