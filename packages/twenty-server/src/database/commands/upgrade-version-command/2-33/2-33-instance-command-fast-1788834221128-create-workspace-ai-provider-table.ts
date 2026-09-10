import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.33.0', 1788834221128)
export class CreateWorkspaceAiProviderTableFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "core"."workspaceAiProvider" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "providerName" text NOT NULL, "npm" text NOT NULL, "label" text NOT NULL, "baseUrl" text, "apiKey" character varying, "models" jsonb NOT NULL DEFAULT \'[]\', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_workspaceAiProvider_apiKey_encrypted" CHECK ("apiKey" IS NULL OR "apiKey" LIKE \'enc:v2:%\'), CONSTRAINT "PK_dc37545e4e94f60fe18fbe6df92" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_WORKSPACE_AI_PROVIDER_WORKSPACE_ID_PROVIDER_NAME_UNIQUE" ON "core"."workspaceAiProvider" ("workspaceId", "providerName") ');
    await queryRunner.query('ALTER TABLE "core"."workspaceAiProvider" ADD CONSTRAINT "FK_fc4275b7cf8d43ffc877625fceb" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."workspaceAiProvider" DROP CONSTRAINT "FK_fc4275b7cf8d43ffc877625fceb"');
    await queryRunner.query('DROP INDEX "core"."IDX_WORKSPACE_AI_PROVIDER_WORKSPACE_ID_PROVIDER_NAME_UNIQUE"');
    await queryRunner.query('DROP TABLE "core"."workspaceAiProvider"');
  }
}
