import { DataSource, QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { SlowInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/slow-instance-command.interface';

@RegisteredInstanceCommand('2.33.0', 1788281726318, { type: 'slow' })
export class BackfillAuthenticatedAtOnUserSessionSlowInstanceCommand
  implements SlowInstanceCommand
{
  async runDataMigration(dataSource: DataSource): Promise<void> {
    await dataSource.query(
      `UPDATE "core"."userSession" SET "authenticatedAt" = "createdAt" WHERE "authenticatedAt" IS NULL`,
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."userSession" ALTER COLUMN "authenticatedAt" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "core"."userSession" ALTER COLUMN "authenticatedAt" DROP NOT NULL`,
    );
  }
}
