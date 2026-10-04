import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.33.0', 1790736149830)
export class CreateMcpServerConnectionTableFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "core"."mcpServerConnection" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "serverUrl" character varying NOT NULL, "authMethod" character varying NOT NULL DEFAULT \'OAUTH\', "authorizationEndpoint" character varying, "tokenEndpoint" character varying, "registrationEndpoint" character varying, "usesManualOverrides" boolean NOT NULL DEFAULT false, "clientId" character varying, "clientSecret" character varying, "accessToken" character varying, "refreshToken" character varying, "tokenExpiresAt" TIMESTAMP WITH TIME ZONE, "scopes" character varying, "status" character varying NOT NULL DEFAULT \'PENDING\', "lastErrorMessage" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_mcpServerConnection_refreshToken_encrypted" CHECK ("refreshToken" IS NULL OR "refreshToken" LIKE \'enc:v2:%\'), CONSTRAINT "CHK_mcpServerConnection_accessToken_encrypted" CHECK ("accessToken" IS NULL OR "accessToken" LIKE \'enc:v2:%\'), CONSTRAINT "CHK_mcpServerConnection_clientSecret_encrypted" CHECK ("clientSecret" IS NULL OR "clientSecret" LIKE \'enc:v2:%\'), CONSTRAINT "PK_b780a34f5d04cd206b8896c6c65" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE INDEX "IDX_MCP_SERVER_CONNECTION_WORKSPACE_ID" ON "core"."mcpServerConnection" ("workspaceId") ');
    await queryRunner.query('ALTER TABLE "core"."mcpServerConnection" ADD CONSTRAINT "FK_2e5d0a172a4e358ca6804322397" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."mcpServerConnection" DROP CONSTRAINT "FK_2e5d0a172a4e358ca6804322397"');
    await queryRunner.query('DROP INDEX "core"."IDX_MCP_SERVER_CONNECTION_WORKSPACE_ID"');
    await queryRunner.query('DROP TABLE "core"."mcpServerConnection"');
  }
}
