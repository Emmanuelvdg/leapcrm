import { Module } from '@nestjs/common';

import { GlobalCompanyDirectoryModule } from 'src/engine/core-modules/global-company-directory/global-company-directory.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { GlobalCompanyDirectoryAdminResolver } from 'src/modules/prospecting/admin/resolvers/global-company-directory-admin.resolver';

// Only reachable through the admin-panel GraphQL API.
@Module({
  imports: [GlobalCompanyDirectoryModule, PermissionsModule],
  providers: [GlobalCompanyDirectoryAdminResolver],
})
export class ProspectingDirectoryAdminModule {}
