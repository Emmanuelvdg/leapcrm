import {
  Controller,
  Get,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { Response } from 'express';
import { ApiPath } from 'twenty-shared/types';

import { AuthOAuthExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-oauth-exception.filter';
import { AuthRestApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-rest-api-exception.filter';
import { OpenAIOAuthGuard } from 'src/engine/core-modules/auth/guards/openai-oauth.guard';
import { OpenAIProviderEnabledGuard } from 'src/engine/core-modules/auth/guards/openai-provider-enabled.guard';
import { AuthService } from 'src/engine/core-modules/auth/services/auth.service';
import { OpenAIRequest } from 'src/engine/core-modules/auth/strategies/openai.auth.strategy';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';

@Controller(`${ApiPath.Auth}/openai`)
@UseFilters(AuthRestApiExceptionFilter)
export class OpenAIAuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(
    OpenAIProviderEnabledGuard,
    OpenAIOAuthGuard,
    PublicEndpointGuard,
    NoPermissionGuard,
  )
  async openAIAuth() {
    // The OAuth guard redirects to ChatGPT's consent screen before this runs.
    return;
  }

  @Get('redirect')
  @UseGuards(
    OpenAIProviderEnabledGuard,
    OpenAIOAuthGuard,
    PublicEndpointGuard,
    NoPermissionGuard,
  )
  @UseFilters(AuthOAuthExceptionFilter)
  async openAIAuthRedirect(@Req() req: OpenAIRequest, @Res() res: Response) {
    return res.redirect(
      await this.authService.signInUpWithSocialSSO(
        req.user,
        AuthProviderEnum.OpenAI,
      ),
    );
  }
}
