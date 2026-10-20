import { Injectable } from '@nestjs/common';

import { v4 } from 'uuid';

import { type RolePermissionConfig } from 'src/engine/twenty-orm/types/role-permission-config';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import {
  type DiscoveredCompany,
  type WrittenCandidate,
} from 'src/modules/prospecting/candidate/types/discovered-company.type';
import {
  buildNewProspectCandidate,
  buildProspectCandidateMergeUpdate,
} from 'src/modules/prospecting/candidate/utils/build-prospect-candidate-fields.util';
import {
  type IdentifiedCandidate,
  ProspectIdentityLookupService,
} from 'src/modules/prospecting/identity-resolution/services/prospect-identity-lookup.service';
import { buildCompanyIdentityKey } from 'src/modules/prospecting/identity-resolution/utils/build-company-identity-key.util';
import { buildCompanyIdentity } from 'src/modules/prospecting/identity-resolution/utils/build-company-identity.util';
import {
  type CompanyIdentityMatch,
  matchCompanyIdentity,
} from 'src/modules/prospecting/identity-resolution/utils/match-company-identity.util';
import { ProspectCandidateWorkspaceEntity } from 'src/modules/prospecting/standard-objects/prospect-candidate.workspace-entity';

// Must run inside a workspace context. Matching reads are internal and bypass
// record permissions; writes use the permissions the caller passes, so an
// import made by a user is limited to what that user may create.
@Injectable()
export class ProspectCandidateWriterService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly prospectIdentityLookupService: ProspectIdentityLookupService,
  ) {}

  async writeDiscoveredCompanies({
    workspaceId,
    campaignId,
    discoveredCompanies,
    writePermissions,
  }: {
    workspaceId: string;
    campaignId: string;
    discoveredCompanies: DiscoveredCompany[];
    writePermissions: RolePermissionConfig;
  }): Promise<WrittenCandidate[]> {
    if (discoveredCompanies.length === 0) {
      return [];
    }

    const identifiedCompanies = discoveredCompanies.map((discoveredCompany) => {
      const identity = buildCompanyIdentity({
        name: discoveredCompany.record.name,
        lei: discoveredCompany.record.lei,
        registrationAuthority: discoveredCompany.record.registrationAuthority,
        registrationNumber: discoveredCompany.record.registrationNumber,
        domain: discoveredCompany.record.domain,
        country: discoveredCompany.record.countryCode,
      });

      return {
        discoveredCompany,
        identity,
        identityKey: buildCompanyIdentityKey({
          identity,
          providerId: discoveredCompany.record.providerId,
          externalId: discoveredCompany.record.externalId,
        }),
      };
    });

    const identities = identifiedCompanies.map(({ identity }) => identity);
    const existingCandidates =
      await this.prospectIdentityLookupService.findCampaignCandidates({
        workspaceId,
        campaignId,
        identities,
        identityKeys: identifiedCompanies.map(({ identityKey }) => identityKey),
      });
    const existingCompanies =
      await this.prospectIdentityLookupService.findCompanies({
        workspaceId,
        identities,
      });

    const candidateRepository =
      await this.globalWorkspaceOrmManager.getRepository(
        workspaceId,
        ProspectCandidateWorkspaceEntity,
        writePermissions,
      );

    const writtenCandidates: WrittenCandidate[] = [];

    // Sequential so that two records of the same page that describe the same
    // company merge into one candidate instead of creating two.
    for (const {
      discoveredCompany,
      identity,
      identityKey,
    } of identifiedCompanies) {
      const companyMatch = matchCompanyIdentity({
        identity,
        existingIdentities: existingCompanies,
      });
      const candidateMatch = this.matchCandidate({
        identity,
        identityKey,
        existingCandidates,
      });

      if (candidateMatch.status === 'CONFIRMED_MATCH') {
        const existingCandidate = existingCandidates.find(
          ({ id }) => id === candidateMatch.matchedId,
        );

        if (existingCandidate) {
          const mergeUpdate = buildProspectCandidateMergeUpdate({
            candidate: existingCandidate.candidate,
            discoveredCompany,
            identity,
            companyMatch,
          });

          if (Object.keys(mergeUpdate).length > 0) {
            await candidateRepository.update(
              { id: existingCandidate.id },
              mergeUpdate,
            );
            Object.assign(existingCandidate.candidate, mergeUpdate);
          }

          writtenCandidates.push({
            candidateId: existingCandidate.id,
            outcome: 'MERGED',
          });
          continue;
        }
      }

      const newCandidate = buildNewProspectCandidate({
        id: v4(),
        campaignId,
        discoveredCompany,
        identity,
        identityKey,
        companyMatch,
        lifecycleStage:
          candidateMatch.status === 'PROBABLE_MATCH' ||
          companyMatch.status === 'PROBABLE_MATCH'
            ? 'HUMAN_REVIEW'
            : 'DISCOVERED',
      });

      await candidateRepository.insert(newCandidate);

      existingCandidates.push({
        id: newCandidate.id,
        identity,
        candidate: newCandidate as unknown as ProspectCandidateWorkspaceEntity,
      });
      writtenCandidates.push({
        candidateId: newCandidate.id,
        outcome: 'CREATED',
      });
    }

    return writtenCandidates;
  }

  // A candidate already stored under the same identity key is the same
  // company by construction, whatever the matcher would say.
  private matchCandidate({
    identity,
    identityKey,
    existingCandidates,
  }: {
    identity: ReturnType<typeof buildCompanyIdentity>;
    identityKey: string;
    existingCandidates: IdentifiedCandidate[];
  }): CompanyIdentityMatch {
    const sameKeyCandidate = existingCandidates.find(
      ({ candidate }) => candidate.identityKey === identityKey,
    );

    if (sameKeyCandidate) {
      return { status: 'CONFIRMED_MATCH', matchedId: sameKeyCandidate.id };
    }

    return matchCompanyIdentity({
      identity,
      existingIdentities: existingCandidates,
    });
  }
}
