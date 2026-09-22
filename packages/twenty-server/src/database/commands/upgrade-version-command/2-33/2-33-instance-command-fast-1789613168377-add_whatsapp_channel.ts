import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.33.0', 1789613168377)
export class AddWhatsappChannelFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "core"."whatsappChannel" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "phoneNumberId" text NOT NULL, "wabaId" text NOT NULL, "displayPhoneNumber" text, "accessToken" character varying, "webhookVerifyToken" text, "connectionStatus" character varying NOT NULL DEFAULT \'CONNECTED\', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_whatsappChannel_accessToken_encrypted" CHECK ("accessToken" IS NULL OR "accessToken" LIKE \'enc:v2:%\'), CONSTRAINT "PK_8ac7fad837587cdfdd55393cb6e" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE INDEX "IDX_WHATSAPP_CHANNEL_WORKSPACE_ID" ON "core"."whatsappChannel" ("workspaceId") ');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_WHATSAPP_CHANNEL_PHONE_NUMBER_ID" ON "core"."whatsappChannel" ("phoneNumberId") ');
    await queryRunner.query('ALTER TABLE "core"."whatsappChannel" ADD CONSTRAINT "FK_e608875df00963dbce6995ee881" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."whatsappChannel" DROP CONSTRAINT "FK_e608875df00963dbce6995ee881"');
    await queryRunner.query('DROP INDEX "core"."IDX_WHATSAPP_CHANNEL_PHONE_NUMBER_ID"');
    await queryRunner.query('DROP INDEX "core"."IDX_WHATSAPP_CHANNEL_WORKSPACE_ID"');
    await queryRunner.query('DROP TABLE "core"."whatsappChannel"');
  }
}
