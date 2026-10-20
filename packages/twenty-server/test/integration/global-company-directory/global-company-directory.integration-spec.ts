import crypto from 'crypto';

import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import { GlobalCompanyCandidateLinkEntity } from 'src/engine/core-modules/global-company-directory/entities/global-company-candidate-link.entity';
import { GlobalCompanySourceEntity } from 'src/engine/core-modules/global-company-directory/entities/global-company-source.entity';
import { GlobalCompanyEntity } from 'src/engine/core-modules/global-company-directory/entities/global-company.entity';
import { GlobalCompanyDirectoryService } from 'src/engine/core-modules/global-company-directory/services/global-company-directory.service';
import {
  type GlobalCompanyValues,
  type PublicCompanyObservation,
} from 'src/engine/core-modules/global-company-directory/types/global-company-values.type';

jest.useRealTimers();

config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  override: true,
});

const RUN_ID = crypto.randomUUID().slice(0, 8);
const REGISTRY_PROVIDER_ID = `it-registry-${RUN_ID}`;
const OPEN_DATA_PROVIDER_ID = `it-open-data-${RUN_ID}`;

const uniqueValue = (prefix: string) =>
  `${prefix}${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`.toUpperCase();

const buildValues = (
  values: Partial<GlobalCompanyValues>,
): GlobalCompanyValues => ({
  name: 'Acme',
  normalizedName: 'ACME',
  countryCode: 'SG',
  region: null,
  canonicalDomain: null,
  lei: null,
  registrationAuthority: null,
  registrationNumber: null,
  industry: null,
  industryCode: null,
  industryCodeScheme: null,
  employeeCount: null,
  description: null,
  ...values,
});

const buildObservation = ({
  providerId = OPEN_DATA_PROVIDER_ID,
  sourceRank = 20,
  externalId = crypto.randomUUID(),
  retrievedAt = new Date(),
  values,
}: {
  providerId?: string;
  sourceRank?: number;
  externalId?: string;
  retrievedAt?: Date;
  values: Partial<GlobalCompanyValues>;
}): PublicCompanyObservation => ({
  providerId,
  externalId,
  sourceUrl: `https://example.com/${externalId}`,
  licenceId: 'CC0-1.0',
  retrievedAt,
  sourceRank,
  values: buildValues(values),
});

describe('GlobalCompanyDirectoryService (integration)', () => {
  let dataSource: DataSource;
  let directoryService: GlobalCompanyDirectoryService;
  let workspaceIds: string[];

  const findCompany = (globalCompanyId: string) =>
    dataSource
      .getRepository(GlobalCompanyEntity)
      .findOneByOrFail({ id: globalCompanyId });

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.PG_DATABASE_URL,
      schema: 'core',
      entities: [
        'src/engine/core-modules/**/*.entity.ts',
        'src/engine/metadata-modules/**/*.entity.ts',
      ],
      synchronize: false,
    });
    await dataSource.initialize();

    directoryService = new GlobalCompanyDirectoryService(
      dataSource.getRepository(GlobalCompanyEntity),
      dataSource.getRepository(GlobalCompanySourceEntity),
      dataSource.getRepository(GlobalCompanyCandidateLinkEntity),
    );

    const workspaces: { id: string }[] = await dataSource.query(
      `SELECT id FROM "core"."workspace" ORDER BY "createdAt" LIMIT 2`,
    );

    if (workspaces.length < 2) {
      throw new Error(
        'Two seeded workspaces are needed; run database:reset before the integration suite.',
      );
    }

    workspaceIds = workspaces.map(({ id }) => id);
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM "core"."globalCompany" WHERE id IN (
         SELECT "globalCompanyId" FROM "core"."globalCompanySource"
         WHERE "providerId" IN ($1, $2)
       )`,
      [REGISTRY_PROVIDER_ID, OPEN_DATA_PROVIDER_ID],
    );
    await dataSource.destroy();
  });

  it('keeps one entry per company across sources and credits every source', async () => {
    const lei = uniqueValue('LEI');
    const canonicalDomain = `${uniqueValue('d').toLowerCase()}.sg`;

    const registryEntryId = await directoryService.recordPublicCompany(
      buildObservation({
        providerId: REGISTRY_PROVIDER_ID,
        sourceRank: 5,
        values: { name: 'ACME PTE. LTD.', lei, industry: null },
      }),
    );
    const openDataEntryId = await directoryService.recordPublicCompany(
      buildObservation({
        values: {
          name: 'Acme Asia',
          lei,
          canonicalDomain,
          employeeCount: 120,
          industry: 'Payments',
        },
      }),
    );

    const company = await findCompany(registryEntryId ?? '');
    const sources = await dataSource
      .getRepository(GlobalCompanySourceEntity)
      .findBy({ globalCompanyId: registryEntryId ?? '' });

    expect(openDataEntryId).toBe(registryEntryId);
    expect(company).toMatchObject({
      name: 'ACME PTE. LTD.',
      lei,
      canonicalDomain,
      employeeCount: 120,
      industry: 'Payments',
    });
    expect(sources.map(({ providerId }) => providerId).sort()).toEqual(
      [OPEN_DATA_PROVIDER_ID, REGISTRY_PROVIDER_ID].sort(),
    );
  });

  it('updates a source seen again instead of adding a second one', async () => {
    const externalId = crypto.randomUUID();
    const lei = uniqueValue('LEI');

    const firstEntryId = await directoryService.recordPublicCompany(
      buildObservation({ externalId, values: { lei, employeeCount: 10 } }),
    );
    const secondEntryId = await directoryService.recordPublicCompany(
      buildObservation({ externalId, values: { lei, employeeCount: 25 } }),
    );

    const sourceCount = await dataSource
      .getRepository(GlobalCompanySourceEntity)
      .countBy({ globalCompanyId: firstEntryId ?? '' });

    expect(secondEntryId).toBe(firstEntryId);
    expect(sourceCount).toBe(1);
    expect((await findCompany(firstEntryId ?? '')).employeeCount).toBe(25);
  });

  it('refuses to merge companies with different LEIs that share a domain', async () => {
    const canonicalDomain = `${uniqueValue('d').toLowerCase()}.sg`;

    const firstEntryId = await directoryService.recordPublicCompany(
      buildObservation({
        values: { lei: uniqueValue('LEI'), canonicalDomain },
      }),
    );
    const secondEntryId = await directoryService.recordPublicCompany(
      buildObservation({
        values: { lei: uniqueValue('LEI'), canonicalDomain },
      }),
    );

    expect(firstEntryId).not.toBeNull();
    expect(secondEntryId).toBeNull();
  });

  it('fills identifiers but never replaces them with a later source', async () => {
    const lei = uniqueValue('LEI');
    const firstDomain = `${uniqueValue('d').toLowerCase()}.sg`;
    const secondDomain = `${uniqueValue('d').toLowerCase()}.sg`;

    const entryId = await directoryService.recordPublicCompany(
      buildObservation({ values: { lei, canonicalDomain: firstDomain } }),
    );

    await directoryService.recordPublicCompany(
      buildObservation({
        providerId: REGISTRY_PROVIDER_ID,
        sourceRank: 5,
        values: { lei, canonicalDomain: secondDomain },
      }),
    );

    expect((await findCompany(entryId ?? '')).canonicalDomain).toBe(
      firstDomain,
    );
  });

  it('serves entries by market and terms and hides quarantined ones', async () => {
    const term = uniqueValue('term').toLowerCase();

    const servedEntryId = await directoryService.recordPublicCompany(
      buildObservation({
        values: { lei: uniqueValue('LEI'), industry: `${term} payments` },
      }),
    );
    const quarantinedEntryId = await directoryService.recordPublicCompany(
      buildObservation({
        values: { lei: uniqueValue('LEI'), description: `About ${term}` },
      }),
    );

    await directoryService.recordPublicCompany(
      buildObservation({
        values: {
          lei: uniqueValue('LEI'),
          countryCode: 'GB',
          industry: `${term} payments`,
        },
      }),
    );
    await directoryService.setQuarantined({
      globalCompanyId: quarantinedEntryId ?? '',
      isQuarantined: true,
    });

    const directoryCompanies = await directoryService.findPublicCompanies({
      countryCode: 'SG',
      searchTerms: [term],
      afterGlobalCompanyId: null,
      limit: 10,
    });

    expect(
      directoryCompanies.map(({ globalCompany }) => globalCompany.id),
    ).toEqual([servedEntryId]);
    expect(directoryCompanies[0].sources[0].providerId).toBe(
      OPEN_DATA_PROVIDER_ID,
    );
  });

  it('links candidates per workspace', async () => {
    const firstEntryId = await directoryService.recordPublicCompany(
      buildObservation({ values: { lei: uniqueValue('LEI') } }),
    );
    const secondEntryId = await directoryService.recordPublicCompany(
      buildObservation({ values: { lei: uniqueValue('LEI') } }),
    );
    const candidateId = crypto.randomUUID();

    await directoryService.linkCandidate({
      workspaceId: workspaceIds[0],
      candidateId,
      globalCompanyId: firstEntryId ?? '',
    });
    await directoryService.linkCandidate({
      workspaceId: workspaceIds[1],
      candidateId,
      globalCompanyId: firstEntryId ?? '',
    });
    await directoryService.linkCandidate({
      workspaceId: workspaceIds[0],
      candidateId,
      globalCompanyId: secondEntryId ?? '',
    });

    const links = await dataSource
      .getRepository(GlobalCompanyCandidateLinkEntity)
      .findBy({ candidateId });

    expect(
      links
        .map(({ workspaceId, globalCompanyId }) => [
          workspaceId,
          globalCompanyId,
        ])
        .sort(),
    ).toEqual(
      [
        [workspaceIds[0], secondEntryId],
        [workspaceIds[1], firstEntryId],
      ].sort(),
    );

    await dataSource
      .getRepository(GlobalCompanyCandidateLinkEntity)
      .delete({ candidateId });
  });

  it('records the same new company from concurrent workers as one entry', async () => {
    const lei = uniqueValue('LEI');

    const entryIds = await Promise.all(
      Array.from({ length: 3 }, () =>
        directoryService.recordPublicCompany(
          buildObservation({ values: { lei } }),
        ),
      ),
    );

    const companyCount = await dataSource
      .getRepository(GlobalCompanyEntity)
      .countBy({ lei });

    expect(new Set(entryIds).size).toBe(1);
    expect(companyCount).toBe(1);
  });
});
