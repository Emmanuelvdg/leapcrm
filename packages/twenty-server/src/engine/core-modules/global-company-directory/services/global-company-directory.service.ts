import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isDefined } from 'twenty-shared/utils';
import {
  Brackets,
  type EntityManager,
  type FindOptionsWhere,
  In,
  Not,
  Repository,
} from 'typeorm';

import { GlobalCompanyCandidateLinkEntity } from 'src/engine/core-modules/global-company-directory/entities/global-company-candidate-link.entity';
import { GlobalCompanySourceEntity } from 'src/engine/core-modules/global-company-directory/entities/global-company-source.entity';
import { GlobalCompanyEntity } from 'src/engine/core-modules/global-company-directory/entities/global-company.entity';
import {
  type GlobalCompanyValues,
  type PublicCompanyObservation,
} from 'src/engine/core-modules/global-company-directory/types/global-company-values.type';
import { mergeGlobalCompanySourceValues } from 'src/engine/core-modules/global-company-directory/utils/merge-global-company-source-values.util';
import { escapeSqlLikePattern } from 'src/utils/escape-sql-like-pattern.util';

type GlobalCompanyIdentityFields = Pick<
  GlobalCompanyValues,
  | 'lei'
  | 'registrationAuthority'
  | 'registrationNumber'
  | 'canonicalDomain'
  | 'countryCode'
>;

type CompanyLookupResult =
  | { kind: 'FOUND'; globalCompanyId: string }
  | { kind: 'NOT_FOUND' }
  | { kind: 'CONFLICT' };

export type DirectoryCompany = {
  globalCompany: GlobalCompanyEntity;
  sources: GlobalCompanySourceEntity[];
};

const hasIdentityConflict = (
  company: GlobalCompanyIdentityFields,
  values: GlobalCompanyIdentityFields,
): boolean =>
  (isDefined(company.lei) &&
    isDefined(values.lei) &&
    company.lei !== values.lei) ||
  (isDefined(company.registrationAuthority) &&
    company.registrationAuthority === values.registrationAuthority &&
    isDefined(company.registrationNumber) &&
    isDefined(values.registrationNumber) &&
    company.registrationNumber !== values.registrationNumber);

// The only reader and writer of the shared directory. Callers must only pass
// facts from public provider responses: never customer imports, scores,
// campaigns, contacts or anything else a tenant owns. Nothing here may be
// exposed through a tenant-facing API, and no method reveals which workspaces
// hold a company.
@Injectable()
export class GlobalCompanyDirectoryService {
  private readonly logger = new Logger(GlobalCompanyDirectoryService.name);

  constructor(
    // Instance-wide tables without a workspaceId.
    // eslint-disable-next-line twenty/prefer-workspace-scoped-repository
    @InjectRepository(GlobalCompanyEntity)
    private readonly globalCompanyRepository: Repository<GlobalCompanyEntity>,
    // eslint-disable-next-line twenty/prefer-workspace-scoped-repository
    @InjectRepository(GlobalCompanySourceEntity)
    private readonly globalCompanySourceRepository: Repository<GlobalCompanySourceEntity>,
    // Every link query filters on an explicit workspaceId.
    // eslint-disable-next-line twenty/prefer-workspace-scoped-repository
    @InjectRepository(GlobalCompanyCandidateLinkEntity)
    private readonly globalCompanyCandidateLinkRepository: Repository<GlobalCompanyCandidateLinkEntity>,
  ) {}

  // Returns the directory entry the observation was recorded on, or null when
  // its identifiers contradict an existing entry and it cannot be placed.
  async recordPublicCompany(
    observation: PublicCompanyObservation,
  ): Promise<string | null> {
    return this.globalCompanyRepository.manager.transaction(
      async (entityManager) => {
        const existingSource = await entityManager.findOne(
          GlobalCompanySourceEntity,
          {
            where: {
              providerId: observation.providerId,
              externalId: observation.externalId,
            },
          },
        );

        const globalCompanyId =
          existingSource?.globalCompanyId ??
          (await this.findOrCreateCompanyId(entityManager, observation.values));

        if (!isDefined(globalCompanyId)) {
          this.logger.warn(
            `Skipped ${observation.providerId} record ${observation.externalId}: its identifiers contradict an existing directory entry`,
          );

          return null;
        }

        await entityManager
          .createQueryBuilder()
          .insert()
          .into(GlobalCompanySourceEntity)
          .values({
            globalCompanyId,
            providerId: observation.providerId,
            externalId: observation.externalId,
            sourceUrl: observation.sourceUrl,
            licenceId: observation.licenceId,
            retrievedAt: observation.retrievedAt,
            sourceRank: observation.sourceRank,
            values: observation.values,
          })
          .orUpdate(
            ['sourceUrl', 'licenceId', 'retrievedAt', 'sourceRank', 'values'],
            ['providerId', 'externalId'],
          )
          .execute();

        await this.refreshCompany(entityManager, globalCompanyId);

        return globalCompanyId;
      },
    );
  }

  async linkCandidate({
    workspaceId,
    candidateId,
    globalCompanyId,
  }: {
    workspaceId: string;
    candidateId: string;
    globalCompanyId: string;
  }): Promise<void> {
    await this.globalCompanyCandidateLinkRepository
      .createQueryBuilder()
      .insert()
      .into(GlobalCompanyCandidateLinkEntity)
      .values({ workspaceId, candidateId, globalCompanyId })
      .orUpdate(['globalCompanyId'], ['workspaceId', 'candidateId'])
      .execute();
  }

  // Reads for discovery: entries in the market whose name, industry or
  // description mention one of the terms, paged by id.
  async findPublicCompanies({
    countryCode,
    searchTerms,
    afterGlobalCompanyId,
    limit,
  }: {
    countryCode: string | null;
    searchTerms: string[];
    afterGlobalCompanyId: string | null;
    limit: number;
  }): Promise<DirectoryCompany[]> {
    const queryBuilder = this.globalCompanyRepository
      .createQueryBuilder('globalCompany')
      .where('globalCompany.isQuarantined = false');

    if (isDefined(countryCode)) {
      queryBuilder.andWhere('globalCompany.countryCode = :countryCode', {
        countryCode,
      });
    }

    if (searchTerms.length > 0) {
      queryBuilder.andWhere(
        new Brackets((termsQueryBuilder) => {
          searchTerms.forEach((searchTerm, index) => {
            const parameterName = `searchTerm${index}`;

            termsQueryBuilder.orWhere(
              `(globalCompany.name ILIKE :${parameterName} OR globalCompany.industry ILIKE :${parameterName} OR globalCompany.description ILIKE :${parameterName})`,
              { [parameterName]: `%${escapeSqlLikePattern(searchTerm)}%` },
            );
          });
        }),
      );
    }

    if (isDefined(afterGlobalCompanyId)) {
      queryBuilder.andWhere('globalCompany.id > :afterGlobalCompanyId', {
        afterGlobalCompanyId,
      });
    }

    const globalCompanies = await queryBuilder
      .orderBy('globalCompany.id', 'ASC')
      .take(limit)
      .getMany();

    if (globalCompanies.length === 0) {
      return [];
    }

    const sources = await this.globalCompanySourceRepository.find({
      where: { globalCompanyId: In(globalCompanies.map(({ id }) => id)) },
      order: { sourceRank: 'ASC', retrievedAt: 'DESC' },
    });

    return globalCompanies.map((globalCompany) => ({
      globalCompany,
      sources: sources.filter(
        (source) => source.globalCompanyId === globalCompany.id,
      ),
    }));
  }

  // Operator view only, from the admin panel: includes quarantined entries.
  async listForOperator({
    search,
    offset,
    limit,
  }: {
    search: string | null;
    offset: number;
    limit: number;
  }): Promise<{ directoryCompanies: DirectoryCompany[]; totalCount: number }> {
    const queryBuilder =
      this.globalCompanyRepository.createQueryBuilder('globalCompany');

    if (isDefined(search) && search.trim().length > 0) {
      const searchPattern = `%${escapeSqlLikePattern(search.trim())}%`;

      queryBuilder.where(
        '(globalCompany.name ILIKE :searchPattern OR globalCompany.lei ILIKE :searchPattern OR globalCompany.canonicalDomain ILIKE :searchPattern OR globalCompany.registrationNumber ILIKE :searchPattern)',
        { searchPattern },
      );
    }

    const [globalCompanies, totalCount] = await queryBuilder
      .orderBy('globalCompany.lastVerifiedAt', 'DESC')
      .addOrderBy('globalCompany.id', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    if (globalCompanies.length === 0) {
      return { directoryCompanies: [], totalCount };
    }

    const sources = await this.globalCompanySourceRepository.find({
      where: { globalCompanyId: In(globalCompanies.map(({ id }) => id)) },
      order: { sourceRank: 'ASC', retrievedAt: 'DESC' },
    });

    return {
      directoryCompanies: globalCompanies.map((globalCompany) => ({
        globalCompany,
        sources: sources.filter(
          (source) => source.globalCompanyId === globalCompany.id,
        ),
      })),
      totalCount,
    };
  }

  // Operator action only, from the admin panel.
  async setQuarantined({
    globalCompanyId,
    isQuarantined,
  }: {
    globalCompanyId: string;
    isQuarantined: boolean;
  }): Promise<void> {
    await this.globalCompanyRepository.update(
      { id: globalCompanyId },
      { isQuarantined, quarantinedAt: isQuarantined ? new Date() : null },
    );
  }

  private async findOrCreateCompanyId(
    entityManager: EntityManager,
    values: GlobalCompanyValues,
  ): Promise<string | null> {
    const lookupResult = await this.findCompanyByIdentity(
      entityManager,
      values,
    );

    if (lookupResult.kind === 'FOUND') {
      return lookupResult.globalCompanyId;
    }

    if (lookupResult.kind === 'CONFLICT') {
      return null;
    }

    // Another worker may insert the same company concurrently; the unique
    // indexes make one insert a no-op and the lookup below then finds it.
    const insertResult = await entityManager
      .createQueryBuilder()
      .insert()
      .into(GlobalCompanyEntity)
      .values({ ...values })
      .orIgnore()
      .returning(['id'])
      .execute();

    const [insertedCompany] = insertResult.raw as { id: string }[];

    if (isDefined(insertedCompany)) {
      return insertedCompany.id;
    }

    const retriedLookup = await this.findCompanyByIdentity(
      entityManager,
      values,
    );

    return retriedLookup.kind === 'FOUND'
      ? retriedLookup.globalCompanyId
      : null;
  }

  private async findCompanyByIdentity(
    entityManager: EntityManager,
    values: GlobalCompanyIdentityFields,
  ): Promise<CompanyLookupResult> {
    const hasRegistration =
      isDefined(values.registrationAuthority) &&
      isDefined(values.registrationNumber);
    const hasDomainInCountry =
      isDefined(values.canonicalDomain) && isDefined(values.countryCode);

    if (!isDefined(values.lei) && !hasRegistration && !hasDomainInCountry) {
      return { kind: 'NOT_FOUND' };
    }

    const companies = await entityManager
      .createQueryBuilder(GlobalCompanyEntity, 'globalCompany')
      .where(
        new Brackets((identityQueryBuilder) => {
          if (isDefined(values.lei)) {
            identityQueryBuilder.orWhere('globalCompany.lei = :lei', {
              lei: values.lei,
            });
          }

          if (hasRegistration) {
            identityQueryBuilder.orWhere(
              '(globalCompany.registrationAuthority = :registrationAuthority AND globalCompany.registrationNumber = :registrationNumber)',
              {
                registrationAuthority: values.registrationAuthority,
                registrationNumber: values.registrationNumber,
              },
            );
          }

          if (hasDomainInCountry) {
            identityQueryBuilder.orWhere(
              '(globalCompany.canonicalDomain = :canonicalDomain AND globalCompany.countryCode = :countryCode)',
              {
                canonicalDomain: values.canonicalDomain,
                countryCode: values.countryCode,
              },
            );
          }
        }),
      )
      .getMany();

    // Strongest identifier first: LEI, then registry number, then domain.
    const bestMatch = [
      companies.find(
        (company) => isDefined(values.lei) && company.lei === values.lei,
      ),
      companies.find(
        (company) =>
          hasRegistration &&
          company.registrationAuthority === values.registrationAuthority &&
          company.registrationNumber === values.registrationNumber,
      ),
      companies.find(
        (company) =>
          hasDomainInCountry &&
          company.canonicalDomain === values.canonicalDomain &&
          company.countryCode === values.countryCode,
      ),
    ].find(isDefined);

    if (!isDefined(bestMatch)) {
      return { kind: 'NOT_FOUND' };
    }

    return hasIdentityConflict(bestMatch, values)
      ? { kind: 'CONFLICT' }
      : { kind: 'FOUND', globalCompanyId: bestMatch.id };
  }

  private async refreshCompany(
    entityManager: EntityManager,
    globalCompanyId: string,
  ): Promise<void> {
    const company = await entityManager.findOneByOrFail(GlobalCompanyEntity, {
      id: globalCompanyId,
    });
    const sources = await entityManager.findBy(GlobalCompanySourceEntity, {
      globalCompanyId,
    });
    const mergedValues = mergeGlobalCompanySourceValues(sources);
    const identityFields = await this.fillIdentityFields(
      entityManager,
      company,
      mergedValues,
    );

    await entityManager.update(
      GlobalCompanyEntity,
      { id: globalCompanyId },
      {
        name: mergedValues.name || company.name,
        normalizedName: mergedValues.normalizedName,
        region: mergedValues.region,
        industry: mergedValues.industry,
        industryCode: mergedValues.industryCode,
        industryCodeScheme: mergedValues.industryCodeScheme,
        employeeCount: mergedValues.employeeCount,
        description: mergedValues.description,
        ...identityFields,
        lastVerifiedAt: new Date(
          Math.max(...sources.map(({ retrievedAt }) => retrievedAt.getTime())),
        ),
      },
    );
  }

  // Identifiers are only filled in, never replaced, and only when no other
  // entry already holds them, so a later source cannot move an entry onto a
  // different company or collide with another entry.
  private async fillIdentityFields(
    entityManager: EntityManager,
    company: GlobalCompanyEntity,
    mergedValues: GlobalCompanyValues,
  ): Promise<Partial<GlobalCompanyIdentityFields>> {
    const isTakenByOtherCompany = (
      where: FindOptionsWhere<GlobalCompanyEntity>,
    ) =>
      entityManager.exists(GlobalCompanyEntity, {
        where: { ...where, id: Not(company.id) },
      });

    const filledFields: Partial<GlobalCompanyIdentityFields> = {};

    if (
      !isDefined(company.lei) &&
      isDefined(mergedValues.lei) &&
      !(await isTakenByOtherCompany({ lei: mergedValues.lei }))
    ) {
      filledFields.lei = mergedValues.lei;
    }

    if (
      !isDefined(company.registrationAuthority) &&
      isDefined(mergedValues.registrationAuthority) &&
      isDefined(mergedValues.registrationNumber) &&
      !(await isTakenByOtherCompany({
        registrationAuthority: mergedValues.registrationAuthority,
        registrationNumber: mergedValues.registrationNumber,
      }))
    ) {
      filledFields.registrationAuthority = mergedValues.registrationAuthority;
      filledFields.registrationNumber = mergedValues.registrationNumber;
    }

    const canonicalDomain =
      company.canonicalDomain ?? mergedValues.canonicalDomain;
    const countryCode = company.countryCode ?? mergedValues.countryCode;
    const isDomainOrCountryNew =
      canonicalDomain !== company.canonicalDomain ||
      countryCode !== company.countryCode;

    if (
      isDomainOrCountryNew &&
      (!isDefined(canonicalDomain) ||
        !isDefined(countryCode) ||
        !(await isTakenByOtherCompany({ canonicalDomain, countryCode })))
    ) {
      filledFields.canonicalDomain = canonicalDomain;
      filledFields.countryCode = countryCode;
    }

    return filledFields;
  }
}
