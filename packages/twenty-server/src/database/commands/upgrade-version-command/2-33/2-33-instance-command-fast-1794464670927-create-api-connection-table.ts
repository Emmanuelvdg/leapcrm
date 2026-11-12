import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.33.0', 1794464670927)
export class CreateApiConnectionTableFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "core"."apiConnection" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "baseUrl" character varying NOT NULL, "authType" character varying NOT NULL DEFAULT \'BEARER\', "authHeaderName" character varying, "secret" character varying, "defaultHeaders" jsonb NOT NULL DEFAULT \'{}\', "operations" jsonb NOT NULL DEFAULT \'[]\', "testOperationName" character varying, "testArguments" jsonb, "openApiSpecUrl" character varying, "status" character varying NOT NULL DEFAULT \'PENDING\', "lastErrorMessage" character varying, "lastTestedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_apiConnection_secret_encrypted" CHECK ("secret" IS NULL OR "secret" LIKE \'enc:v2:%\'), CONSTRAINT "PK_d8a7bb2e0d3496927ef4a1bcf87" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE INDEX "IDX_API_CONNECTION_WORKSPACE_ID" ON "core"."apiConnection" ("workspaceId") ');
    await queryRunner.query('ALTER TABLE "core"."apiConnection" ADD CONSTRAINT "FK_88801d4db35641e7864da248b9c" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."apiConnection" DROP CONSTRAINT "FK_88801d4db35641e7864da248b9c"');
    await queryRunner.query('DROP INDEX "core"."IDX_API_CONNECTION_WORKSPACE_ID"');
    await queryRunner.query('DROP TABLE "core"."apiConnection"');
  }
}
