import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type CreateManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { IcpModelValidationService } from 'src/modules/icp-analysis/services/icp-model-validation.service';
import { type IcpModelInput } from 'src/modules/icp-analysis/types/icp-model-input.type';

@WorkspaceQueryHook(`icpModel.createMany`)
export class IcpModelCreateManyPreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly icpModelValidationService: IcpModelValidationService,
  ) {}

  async execute(
    _authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: CreateManyResolverArgs<IcpModelInput>,
  ): Promise<CreateManyResolverArgs<IcpModelInput>> {
    this.icpModelValidationService.assertNotUpsert(payload.upsert);

    return {
      ...payload,
      data: payload.data.map((data) =>
        this.icpModelValidationService.prepareCreateData(data),
      ),
    };
  }
}
