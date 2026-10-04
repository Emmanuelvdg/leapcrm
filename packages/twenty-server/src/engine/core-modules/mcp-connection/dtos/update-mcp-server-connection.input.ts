import { Field, InputType } from '@nestjs/graphql';

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class UpdateMcpServerConnectionInput {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  id: string;

  @IsString()
  @IsOptional()
  @Field({ nullable: true })
  name?: string;

  @IsUrl()
  @IsOptional()
  @Field({ nullable: true })
  serverUrl?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Field({ nullable: true })
  apiKey?: string;
}
