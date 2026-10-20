import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.33.0', 1792465446643)
export class CreateGlobalCompanyDirectoryTablesFastInstanceCommand implements FastInstanceCommand {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "core"."globalCompany" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "normalizedName" character varying, "countryCode" character varying, "region" character varying, "canonicalDomain" character varying, "lei" character varying, "registrationAuthority" character varying, "registrationNumber" character varying, "industry" character varying, "industryCode" character varying, "industryCodeScheme" character varying, "employeeCount" integer, "description" text, "isQuarantined" boolean NOT NULL DEFAULT false, "quarantinedAt" TIMESTAMP WITH TIME ZONE, "firstSeenAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "lastVerifiedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_edd6506c0ca0b8bd509ae8bbe58" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_GLOBAL_COMPANY_LEI_UNIQUE" ON "core"."globalCompany" ("lei") WHERE "lei" IS NOT NULL');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_GLOBAL_COMPANY_REGISTRATION_UNIQUE" ON "core"."globalCompany" ("registrationAuthority", "registrationNumber") WHERE "registrationAuthority" IS NOT NULL AND "registrationNumber" IS NOT NULL');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_GLOBAL_COMPANY_DOMAIN_COUNTRY_UNIQUE" ON "core"."globalCompany" ("canonicalDomain", "countryCode") WHERE "canonicalDomain" IS NOT NULL AND "countryCode" IS NOT NULL');
    await queryRunner.query('CREATE INDEX "IDX_GLOBAL_COMPANY_COUNTRY_CODE" ON "core"."globalCompany" ("countryCode") ');
    await queryRunner.query('CREATE TABLE "core"."globalCompanySource" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "globalCompanyId" uuid NOT NULL, "providerId" character varying NOT NULL, "externalId" character varying NOT NULL, "sourceUrl" character varying, "licenceId" character varying NOT NULL, "retrievedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "sourceRank" integer NOT NULL, "values" jsonb NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ebedbe57e2f9afe0fbf71a98e80" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_GLOBAL_COMPANY_SOURCE_PROVIDER_EXTERNAL_ID_UNIQUE" ON "core"."globalCompanySource" ("providerId", "externalId") ');
    await queryRunner.query('CREATE INDEX "IDX_GLOBAL_COMPANY_SOURCE_GLOBAL_COMPANY_ID" ON "core"."globalCompanySource" ("globalCompanyId") ');
    await queryRunner.query('CREATE TABLE "core"."globalCompanyCandidateLink" ("workspaceId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "candidateId" uuid NOT NULL, "globalCompanyId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a57a3a297b025967e6cf82fcd95" PRIMARY KEY ("id"))');
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_GLOBAL_COMPANY_CANDIDATE_LINK_WORKSPACE_CANDIDATE_UNIQUE" ON "core"."globalCompanyCandidateLink" ("workspaceId", "candidateId") ');
    await queryRunner.query('CREATE INDEX "IDX_GLOBAL_COMPANY_CANDIDATE_LINK_GLOBAL_COMPANY_ID" ON "core"."globalCompanyCandidateLink" ("globalCompanyId") ');
    await queryRunner.query('ALTER TABLE "core"."globalCompanySource" ADD CONSTRAINT "FK_774bad1b8c28c76c6501b2401ba" FOREIGN KEY ("globalCompanyId") REFERENCES "core"."globalCompany"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE "core"."globalCompanyCandidateLink" ADD CONSTRAINT "FK_fab4f17f7e2f377db1a11d9f957" FOREIGN KEY ("workspaceId") REFERENCES "core"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
    await queryRunner.query('ALTER TABLE "core"."globalCompanyCandidateLink" ADD CONSTRAINT "FK_a7b752a6a348ae534853fac3819" FOREIGN KEY ("globalCompanyId") REFERENCES "core"."globalCompany"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "core"."globalCompanyCandidateLink" DROP CONSTRAINT "FK_a7b752a6a348ae534853fac3819"');
    await queryRunner.query('ALTER TABLE "core"."globalCompanyCandidateLink" DROP CONSTRAINT "FK_fab4f17f7e2f377db1a11d9f957"');
    await queryRunner.query('ALTER TABLE "core"."globalCompanySource" DROP CONSTRAINT "FK_774bad1b8c28c76c6501b2401ba"');
    await queryRunner.query('DROP INDEX "core"."IDX_GLOBAL_COMPANY_CANDIDATE_LINK_GLOBAL_COMPANY_ID"');
    await queryRunner.query('DROP INDEX "core"."IDX_GLOBAL_COMPANY_CANDIDATE_LINK_WORKSPACE_CANDIDATE_UNIQUE"');
    await queryRunner.query('DROP TABLE "core"."globalCompanyCandidateLink"');
    await queryRunner.query('DROP INDEX "core"."IDX_GLOBAL_COMPANY_SOURCE_GLOBAL_COMPANY_ID"');
    await queryRunner.query('DROP INDEX "core"."IDX_GLOBAL_COMPANY_SOURCE_PROVIDER_EXTERNAL_ID_UNIQUE"');
    await queryRunner.query('DROP TABLE "core"."globalCompanySource"');
    await queryRunner.query('DROP INDEX "core"."IDX_GLOBAL_COMPANY_COUNTRY_CODE"');
    await queryRunner.query('DROP INDEX "core"."IDX_GLOBAL_COMPANY_DOMAIN_COUNTRY_UNIQUE"');
    await queryRunner.query('DROP INDEX "core"."IDX_GLOBAL_COMPANY_REGISTRATION_UNIQUE"');
    await queryRunner.query('DROP INDEX "core"."IDX_GLOBAL_COMPANY_LEI_UNIQUE"');
    await queryRunner.query('DROP TABLE "core"."globalCompany"');
  }
}
