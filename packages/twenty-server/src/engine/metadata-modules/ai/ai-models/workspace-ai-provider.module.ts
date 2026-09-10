import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SecretEncryptionModule } from 'src/engine/core-modules/secret-encryption/secret-encryption.module';
import { WorkspaceAiProviderEntity } from 'src/engine/metadata-modules/ai/ai-models/entities/workspace-ai-provider.entity';
import { WorkspaceAiProviderResolver } from 'src/engine/metadata-modules/ai/ai-models/resolvers/workspace-ai-provider.resolver';
import { WorkspaceAiProviderService } from 'src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider.service';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { provideWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/provide-workspace-scoped-repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkspaceAiProviderEntity]),
    SecretEncryptionModule,
    PermissionsModule,
  ],
  providers: [
    WorkspaceAiProviderResolver,
    WorkspaceAiProviderService,
    provideWorkspaceScopedRepository(WorkspaceAiProviderEntity),
  ],
  exports: [WorkspaceAiProviderService],
})
export class WorkspaceAiProviderModule {}
