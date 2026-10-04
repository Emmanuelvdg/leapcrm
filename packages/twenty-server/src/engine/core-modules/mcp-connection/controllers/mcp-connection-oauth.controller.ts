import { Controller, Get, Logger, Query, Res, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { type Response } from 'express';
import { ApiPath, SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { TransientTokenService } from 'src/engine/core-modules/auth/token/services/transient-token.service';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { GuardRedirectService } from 'src/engine/core-modules/guard-redirect/services/guard-redirect.service';
import { McpConnectionOAuthFlowService } from 'src/engine/core-modules/mcp-connection/services/mcp-connection-oauth-flow.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

@Controller(`${ApiPath.Auth}/mcp-connections`)
@UseGuards(PublicEndpointGuard, NoPermissionGuard)
export class McpConnectionOAuthController {
  private readonly logger = new Logger(McpConnectionOAuthController.name);

  constructor(
    private readonly mcpConnectionOAuthFlowService: McpConnectionOAuthFlowService,
    private readonly transientTokenService: TransientTokenService,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
    private readonly guardRedirectService: GuardRedirectService,
    private readonly twentyConfigService: TwentyConfigService,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  // Public endpoint — the transient token carries workspace + user context,
  // same as the app-connection OAuth flow, so no session cookie is needed.
  @Get('authorize')
  async authorize(
    @Query('connectionId') connectionId: string,
    @Query('transientToken') transientToken: string,
    @Res() res: Response,
  ) {
    let workspace: WorkspaceEntity | null = null;

    try {
      if (!connectionId || !transientToken) {
        throw new AuthException(
          'Missing required query parameters: connectionId, transientToken',
          AuthExceptionCode.INVALID_INPUT,
        );
      }

      const { userId, workspaceId } =
        await this.transientTokenService.verifyTransientToken(transientToken);

      if (!workspaceId || !userId) {
        throw new AuthException(
          'Workspace or user not found in transient token',
          AuthExceptionCode.WORKSPACE_NOT_FOUND,
        );
      }

      workspace = await this.workspaceRepository.findOneBy({
        id: workspaceId,
      });

      if (!workspace) {
        throw new AuthException(
          `Workspace ${workspaceId} not found`,
          AuthExceptionCode.WORKSPACE_NOT_FOUND,
        );
      }

      const { authorizationUrl } =
        await this.mcpConnectionOAuthFlowService.startAuthorizationFlow({
          connectionId,
          workspaceId,
          userId,
        });

      return res.redirect(authorizationUrl);
    } catch (error) {
      this.logger.error(
        `MCP connection authorize failed (connectionId=${connectionId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );

      return this.redirectToError(res, error, workspace);
    }
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') errorParam: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    const workspace: WorkspaceEntity | null = null;

    if (errorParam) {
      return this.redirectToError(
        res,
        new Error(
          `OAuth provider returned error: ${errorParam}${errorDescription ? `: ${errorDescription}` : ''}`,
        ),
        workspace,
      );
    }

    if (!code || !state) {
      return this.redirectToError(
        res,
        new Error(
          'OAuth callback is missing the `code` or `state` query parameter',
        ),
        workspace,
      );
    }

    try {
      const { workspaceId } =
        await this.mcpConnectionOAuthFlowService.completeAuthorizationFlow({
          code,
          state,
        });

      const completedWorkspace = await this.workspaceRepository.findOneBy({
        id: workspaceId,
      });

      if (!completedWorkspace) {
        throw new AuthException(
          `Workspace ${workspaceId} not found after OAuth callback`,
          AuthExceptionCode.WORKSPACE_NOT_FOUND,
        );
      }

      const url = this.workspaceDomainsService.buildWorkspaceURL({
        workspace: completedWorkspace,
        pathname: getSettingsPath(SettingsPath.Integrations),
      });

      return res.redirect(url.toString());
    } catch (error) {
      return this.redirectToError(res, error, workspace);
    }
  }

  private redirectToError(
    res: Response,
    error: unknown,
    workspace: WorkspaceEntity | null,
  ) {
    return res.redirect(
      this.guardRedirectService.getRedirectErrorUrlAndCaptureExceptions({
        error: error instanceof Error ? error : new Error(String(error)),
        workspace: {
          id: workspace?.id,
          subdomain:
            workspace?.subdomain ??
            this.twentyConfigService.get('DEFAULT_SUBDOMAIN'),
          customDomain: workspace?.customDomain ?? null,
        },
        pathname: getSettingsPath(SettingsPath.Integrations),
      }),
    );
  }
}
