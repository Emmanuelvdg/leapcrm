import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';

import { ApiPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { DomainServerConfigService } from 'src/engine/core-modules/domain/domain-server-config/services/domain-server-config.service';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

// Backs Caddy's on-demand TLS "ask" check (packages/twenty-docker/Caddyfile.prod.example):
// a 2xx here means "issue a certificate for this hostname", anything else means deny.
// Without this, anyone could request certs for made-up subdomains and burn the
// Let's Encrypt rate limit shared by the whole domain.
@Controller(ApiPath.TlsCertAsk)
export class TlsCertAskController {
  constructor(
    private readonly domainServerConfigService: DomainServerConfigService,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
  ) {}

  @Get()
  @UseGuards(PublicEndpointGuard, NoPermissionGuard)
  async ask(@Query('domain') domain?: string): Promise<{ allowed: true }> {
    const hostname = this.parseHostnameOrUndefined(domain);

    if (!isDefined(hostname)) {
      throw new ForbiddenException();
    }

    const frontHostname = this.domainServerConfigService.getFrontUrl().hostname;

    if (hostname === frontHostname) {
      return { allowed: true };
    }

    const { workspace } =
      await this.workspaceDomainsService.resolveWorkspaceAndPublicDomain(
        `https://${hostname}`,
      );

    if (!isDefined(workspace)) {
      throw new ForbiddenException();
    }

    return { allowed: true };
  }

  private parseHostnameOrUndefined(domain?: string): string | undefined {
    if (!isDefined(domain)) {
      return undefined;
    }

    try {
      return new URL(`https://${domain}`).hostname;
    } catch {
      return undefined;
    }
  }
}
