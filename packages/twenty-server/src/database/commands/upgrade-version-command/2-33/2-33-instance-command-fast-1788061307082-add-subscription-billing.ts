import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.33.0', 1788061307082)
export class AddSubscriptionBillingFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TYPE "core"."workspaceSubscription_status_enum" AS ENUM(\'TRIALING\', \'ACTIVE\', \'PAST_DUE\', \'CANCELED\', \'INCOMPLETE\')');
    await queryRunner.query('CREATE TABLE "core"."workspaceSubscription" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "stripeCustomerId" text, "stripeSubscriptionId" text, "status" "core"."workspaceSubscription_status_enum" NOT NULL DEFAULT \'TRIALING\', "seats" integer NOT NULL DEFAULT \'0\', "trialEnd" TIMESTAMP WITH TIME ZONE, "currentPeriodEnd" TIMESTAMP WITH TIME ZONE, "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8158cb7facd568c67e1e19fabf9" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_WORKSPACE_SUBSCRIPTION_WORKSPACE_ID" ON "core"."workspaceSubscription" ("workspaceId") ');
    await queryRunner.query('CREATE TABLE "core"."subscriptionPlan" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "unitAmountCents" integer NOT NULL, "currency" character varying NOT NULL DEFAULT \'usd\', "interval" character varying NOT NULL DEFAULT \'month\', "stripeProductId" text, "stripePriceId" text, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1fb411cded2ca9a0e648c96e4a9" PRIMARY KEY ("id"))');
    await queryRunner.query('ALTER TABLE "core"."workspaceSubscription" ADD CONSTRAINT "FK_526366ab0ff35b1e7d2bbd1ca2d" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."workspaceSubscription" DROP CONSTRAINT "FK_526366ab0ff35b1e7d2bbd1ca2d"');
    await queryRunner.query('DROP TABLE "core"."subscriptionPlan"');
    await queryRunner.query('DROP INDEX "core"."IDX_WORKSPACE_SUBSCRIPTION_WORKSPACE_ID"');
    await queryRunner.query('DROP TABLE "core"."workspaceSubscription"');
    await queryRunner.query('DROP TYPE "core"."workspaceSubscription_status_enum"');
  }
}
