import { Field, HideField, ObjectType } from '@nestjs/graphql';

import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { McpServerConnectionAuthMethod } from 'src/engine/core-modules/mcp-connection/enums/mcp-server-connection-auth-method.enum';
import { McpServerConnectionStatus } from 'src/engine/core-modules/mcp-connection/enums/mcp-server-connection-status.enum';

@ObjectType('McpServerConnection')
export class McpServerConnectionDTO {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  id: string;

  @IsString()
  @IsNotEmpty()
  @Field()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Field()
  serverUrl: string;

  @Field(() => McpServerConnectionAuthMethod)
  authMethod: McpServerConnectionAuthMethod;

  @IsBoolean()
  @Field()
  usesManualOverrides: boolean;

  @Field(() => McpServerConnectionStatus)
  status: McpServerConnectionStatus;

  @IsString()
  @IsOptional()
  @Field(() => String, { nullable: true })
  lastErrorMessage: string | null;

  @HideField()
  workspaceId: string;

  @IsDateString()
  @Field()
  createdAt: Date;

  @IsDateString()
  @Field()
  updatedAt: Date;
}
