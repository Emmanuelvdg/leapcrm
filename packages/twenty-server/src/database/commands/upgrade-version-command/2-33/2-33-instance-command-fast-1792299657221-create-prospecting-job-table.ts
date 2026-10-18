import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.33.0', 1792299657221)
export class CreateProspectingJobTableFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "core"."prospectingJob" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "campaignId" uuid NOT NULL, "candidateId" uuid, "operation" character varying NOT NULL, "idempotencyKey" character varying NOT NULL, "status" character varying NOT NULL DEFAULT \'PENDING\', "attempts" integer NOT NULL DEFAULT \'0\', "maxAttempts" integer NOT NULL DEFAULT \'5\', "nextRunAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "lastEnqueuedAt" TIMESTAMP WITH TIME ZONE, "lockedAt" TIMESTAMP WITH TIME ZONE, "lockedBy" character varying, "input" jsonb NOT NULL DEFAULT \'{}\', "result" jsonb, "lastErrorCode" character varying, "lastErrorMessage" character varying, "correlationId" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2e5733e3ceaf486a1f2eac5e154" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_PROSPECTING_JOB_WORKSPACE_ID_IDEMPOTENCY_KEY_UNIQUE" ON "core"."prospectingJob" ("workspaceId", "idempotencyKey") ');
    await queryRunner.query('CREATE INDEX "IDX_PROSPECTING_JOB_WORKSPACE_ID_CAMPAIGN_ID" ON "core"."prospectingJob" ("workspaceId", "campaignId") ');
    await queryRunner.query('CREATE INDEX "IDX_PROSPECTING_JOB_STATUS_NEXT_RUN_AT" ON "core"."prospectingJob" ("status", "nextRunAt") ');
    await queryRunner.query('ALTER TABLE "core"."prospectingJob" ADD CONSTRAINT "FK_d993d166e2b6713d07078aad4c0" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."prospectingJob" DROP CONSTRAINT "FK_d993d166e2b6713d07078aad4c0"');
    await queryRunner.query('DROP INDEX "core"."IDX_PROSPECTING_JOB_STATUS_NEXT_RUN_AT"');
    await queryRunner.query('DROP INDEX "core"."IDX_PROSPECTING_JOB_WORKSPACE_ID_CAMPAIGN_ID"');
    await queryRunner.query('DROP INDEX "core"."IDX_PROSPECTING_JOB_WORKSPACE_ID_IDEMPOTENCY_KEY_UNIQUE"');
    await queryRunner.query('DROP TABLE "core"."prospectingJob"');
  }
}
