import { UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';

import { AdminResolver } from 'src/engine/api/graphql/graphql-config/decorators/admin-resolver.decorator';
import { GlobalCompanyDirectoryService } from 'src/engine/core-modules/global-company-directory/services/global-company-directory.service';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { AdminPanelGuard } from 'src/engine/guards/admin-panel-guard';
import { NoImpersonationGuard } from 'src/engine/guards/no-impersonation.guard';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { GlobalCompanyDirectoryPageDTO } from 'src/modules/prospecting/admin/dtos/global-company-directory-entry.dto';
import {
  GlobalCompanyDirectoryEntriesInput,
  SetGlobalCompanyQuarantinedInput,
} from 'src/modules/prospecting/admin/dtos/global-company-directory.input';

// Instance operators only: the directory is never exposed to tenants.
@AdminResolver()
@UseGuards(
  WorkspaceAuthGuard,
  UserAuthGuard,
  SettingsPermissionGuard(PermissionFlagType.SECURITY),
)
@UsePipes(ResolverValidationPipe)
export class GlobalCompanyDirectoryAdminResolver {
  constructor(
    private readonly globalCompanyDirectoryService: GlobalCompanyDirectoryService,
  ) {}

  @UseGuards(AdminPanelGuard)
  @Query(() => GlobalCompanyDirectoryPageDTO)
  async globalCompanyDirectoryEntries(
    @Args('input') input: GlobalCompanyDirectoryEntriesInput,
  ): Promise<GlobalCompanyDirectoryPageDTO> {
    const { directoryCompanies, totalCount } =
      await this.globalCompanyDirectoryService.listForOperator({
        search: input.search ?? null,
        offset: input.offset,
        limit: input.limit,
      });

    return {
      totalCount,
      entries: directoryCompanies.map(({ globalCompany, sources }) => ({
        id: globalCompany.id,
        name: globalCompany.name,
        countryCode: globalCompany.countryCode,
        canonicalDomain: globalCompany.canonicalDomain,
        lei: globalCompany.lei,
        registrationAuthority: globalCompany.registrationAuthority,
        registrationNumber: globalCompany.registrationNumber,
        industry: globalCompany.industry,
        employeeCount: globalCompany.employeeCount,
        sourceProviderIds: [
          ...new Set(sources.map(({ providerId }) => providerId)),
        ],
        isQuarantined: globalCompany.isQuarantined,
        lastVerifiedAt: globalCompany.lastVerifiedAt,
      })),
    };
  }

  @UseGuards(AdminPanelGuard, NoImpersonationGuard)
  @Mutation(() => Boolean)
  async setGlobalCompanyQuarantined(
    @Args('input') input: SetGlobalCompanyQuarantinedInput,
  ): Promise<boolean> {
    await this.globalCompanyDirectoryService.setQuarantined({
      globalCompanyId: input.globalCompanyId,
      isQuarantined: input.isQuarantined,
    });

    return true;
  }
}
