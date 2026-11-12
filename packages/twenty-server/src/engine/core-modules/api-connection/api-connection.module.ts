import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApiConnectionResolver } from 'src/engine/core-modules/api-connection/api-connection.resolver';
import { ApiConnectionEntity } from 'src/engine/core-modules/api-connection/entities/api-connection.entity';
import { ApiConnectionGraphqlApiExceptionInterceptor } from 'src/engine/core-modules/api-connection/interceptors/api-connection-graphql-api-exception.interceptor';
import { ApiConnectionClientService } from 'src/engine/core-modules/api-connection/services/api-connection-client.service';
import { ApiConnectionOpenApiImportService } from 'src/engine/core-modules/api-connection/services/api-connection-open-api-import.service';
import { ApiConnectionTestService } from 'src/engine/core-modules/api-connection/services/api-connection-test.service';
import { ApiConnectionService } from 'src/engine/core-modules/api-connection/services/api-connection.service';
import { ApiConnectionCallTool } from 'src/engine/core-modules/api-connection/tools/api-connection-call.tool';
import { SecretEncryptionModule } from 'src/engine/core-modules/secret-encryption/secret-encryption.module';
import { SecureHttpClientModule } from 'src/engine/core-modules/secure-http-client/secure-http-client.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { provideWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/provide-workspace-scoped-repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiConnectionEntity]),
    SecretEncryptionModule,
    SecureHttpClientModule,
    PermissionsModule,
  ],
  providers: [
    ApiConnectionService,
    ApiConnectionClientService,
    ApiConnectionTestService,
    ApiConnectionOpenApiImportService,
    ApiConnectionCallTool,
    ApiConnectionResolver,
    ApiConnectionGraphqlApiExceptionInterceptor,
    provideWorkspaceScopedRepository(ApiConnectionEntity),
  ],
  exports: [
    ApiConnectionService,
    ApiConnectionClientService,
    ApiConnectionCallTool,
  ],
})
export class ApiConnectionModule {}
