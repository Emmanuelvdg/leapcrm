import { Injectable } from '@nestjs/common';

import { ILike, In } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import {
  buildDomainLookupPattern,
  buildNameLookupPattern,
  getUniqueIdentityValues,
} from 'src/modules/prospecting/identity-resolution/utils/build-company-lookup-patterns.util';
import {
  buildCompanyIdentity,
  type CompanyIdentity,
} from 'src/modules/prospecting/identity-resolution/utils/build-company-identity.util';
import { ProspectCandidateWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospect-candidate.workspace-entity';

// Bounds one lookup for a page of records; a page never legitimately
// matches more rows than this.
const IDENTITY_LOOKUP_MAX_ROWS = 1000;

export type IdentifiedRecord = {
  id: string;
  identity: CompanyIdentity;
};

export type IdentifiedCandidate = IdentifiedRecord & {
  candidate: ProspectCandidateWorkspaceEntity;
};

// Must run inside a workspace context. Reads bypass record permissions
// because discovery runs as the system, never on behalf of a user.
@Injectable()
export class ProspectIdentityLookupService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async findCampaignCandidates({
    workspaceId,
    campaignId,
    identities,
    identityKeys,
  }: {
    workspaceId: string;
    campaignId: string;
    identities: CompanyIdentity[];
    identityKeys: string[];
  }): Promise<IdentifiedCandidate[]> {
    const leis = getUniqueIdentityValues(identities, ({ lei }) => lei);
    const registrationNumbers = getUniqueIdentityValues(
      identities,
      ({ registration }) => registration?.number ?? null,
    );
    const domains = getUniqueIdentityValues(identities, ({ domain }) => domain);
    const names = getUniqueIdentityValues(
      identities,
      ({ normalizedName }) => normalizedName,
    );

    const conditions = [
      ...(identityKeys.length > 0
        ? [{ campaignId, identityKey: In(identityKeys) }]
        : []),
      ...(leis.length > 0 ? [{ campaignId, lei: In(leis) }] : []),
      ...(registrationNumbers.length > 0
        ? [{ campaignId, registrationNumber: In(registrationNumbers) }]
        : []),
      ...domains.map((domain) => ({
        campaignId,
        domain: { primaryLinkUrl: ILike(buildDomainLookupPattern(domain)) },
      })),
      ...names.map((name) => ({
        campaignId,
        name: ILike(buildNameLookupPattern(name)),
      })),
    ];

    if (conditions.length === 0) {
      return [];
    }

    const candidateRepository =
      await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        ProspectCandidateWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const candidates = await candidateRepository.find({
      where: conditions,
      take: IDENTITY_LOOKUP_MAX_ROWS,
    });

    return candidates.map((candidate) => ({
      id: candidate.id,
      candidate,
      identity: buildCompanyIdentity({
        name: candidate.name,
        lei: candidate.lei,
        registrationAuthority: candidate.registrationAuthority,
        registrationNumber: candidate.registrationNumber,
        domain: candidate.domain?.primaryLinkUrl,
        country: candidate.country,
      }),
    }));
  }

  // CRM companies carry no LEI or registry number, only a domain, a name and
  // an address, so those are what they can be matched on.
  async findCompanies({
    workspaceId,
    identities,
  }: {
    workspaceId: string;
    identities: CompanyIdentity[];
  }): Promise<IdentifiedRecord[]> {
    const domains = getUniqueIdentityValues(identities, ({ domain }) => domain);
    const names = getUniqueIdentityValues(
      identities,
      ({ normalizedName }) => normalizedName,
    );

    const conditions = [
      ...domains.map((domain) => ({
        domainName: { primaryLinkUrl: ILike(buildDomainLookupPattern(domain)) },
      })),
      ...names.map((name) => ({ name: ILike(buildNameLookupPattern(name)) })),
    ];

    if (conditions.length === 0) {
      return [];
    }

    const companyRepository =
      await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        CompanyWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    const companies = await companyRepository.find({
      where: conditions,
      take: IDENTITY_LOOKUP_MAX_ROWS,
    });

    return companies.map((company) => ({
      id: company.id,
      identity: buildCompanyIdentity({
        name: company.name,
        domain: company.domainName?.primaryLinkUrl,
        country: company.address?.addressCountry,
      }),
    }));
  }
}
