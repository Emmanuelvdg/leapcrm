import { Module } from '@nestjs/common';

import { DomainServerConfigModule } from 'src/engine/core-modules/domain/domain-server-config/domain-server-config.module';
import { WorkspaceDomainsModule } from 'src/engine/core-modules/domain/workspace-domains/workspace-domains.module';
import { TlsCertAskController } from 'src/engine/core-modules/tls-cert-ask/controllers/tls-cert-ask.controller';

@Module({
  imports: [DomainServerConfigModule, WorkspaceDomainsModule],
  controllers: [TlsCertAskController],
})
export class TlsCertAskModule {}
