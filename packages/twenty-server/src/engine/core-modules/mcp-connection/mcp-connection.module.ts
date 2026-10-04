import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { McpServerConnectionEntity } from 'src/engine/core-modules/mcp-connection/entities/mcp-server-connection.entity';
import { McpConnectionGraphqlApiExceptionInterceptor } from 'src/engine/core-modules/mcp-connection/interceptors/mcp-connection-graphql-api-exception.interceptor';
import { McpConnectionResolver } from 'src/engine/core-modules/mcp-connection/mcp-connection.resolver';
import { McpClientService } from 'src/engine/core-modules/mcp-connection/services/mcp-client.service';
import { McpConnectionOAuthFlowService } from 'src/engine/core-modules/mcp-connection/services/mcp-connection-oauth-flow.service';
import { McpConnectionTokenRefreshService } from 'src/engine/core-modules/mcp-connection/services/mcp-connection-token-refresh.service';
import { McpConnectionService } from 'src/engine/core-modules/mcp-connection/services/mcp-connection.service';
import { McpDynamicClientRegistrationService } from 'src/engine/core-modules/mcp-connection/services/mcp-dynamic-client-registration.service';
import { McpOAuthDiscoveryService } from 'src/engine/core-modules/mcp-connection/services/mcp-oauth-discovery.service';
import { McpToolCallTool } from 'src/engine/core-modules/mcp-connection/tools/mcp-tool-call.tool';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { SecretEncryptionModule } from 'src/engine/core-modules/secret-encryption/secret-encryption.module';
import { SecureHttpClientModule } from 'src/engine/core-modules/secure-http-client/secure-http-client.module';
import { provideWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/provide-workspace-scoped-repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([McpServerConnectionEntity]),
    JwtModule,
    SecretEncryptionModule,
    SecureHttpClientModule,
    PermissionsModule,
  ],
  providers: [
    McpConnectionService,
    McpOAuthDiscoveryService,
    McpDynamicClientRegistrationService,
    McpConnectionOAuthFlowService,
    McpConnectionTokenRefreshService,
    McpClientService,
    McpToolCallTool,
    McpConnectionResolver,
    McpConnectionGraphqlApiExceptionInterceptor,
    provideWorkspaceScopedRepository(McpServerConnectionEntity),
  ],
  exports: [
    McpConnectionService,
    McpClientService,
    McpConnectionOAuthFlowService,
    McpToolCallTool,
  ],
})
export class McpConnectionModule {}
