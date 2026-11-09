import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { DEFAULT_ICP_TIER_THRESHOLDS } from 'twenty-shared/icp-analysis';
import { isDefined } from 'twenty-shared/utils';

import {
  CommonQueryRunnerException,
  CommonQueryRunnerExceptionCode,
} from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  ICP_MODEL_DEFAULT_LOST_STAGES,
  ICP_MODEL_DEFAULT_WON_STAGES,
} from 'src/modules/icp-analysis/constants/icp-model-default-stages.constant';
import { ICP_MODEL_LOCKED_FIELD_NAMES } from 'src/modules/icp-analysis/constants/icp-model-locked-field-names.constant';
import { IcpModelWorkspaceEntity } from 'src/modules/icp-analysis/standard-objects/icp-model.workspace-entity';
import { type IcpModelInput } from 'src/modules/icp-analysis/types/icp-model-input.type';
import { getIcpModelInputError } from 'src/modules/icp-analysis/utils/get-icp-model-input-error.util';

const throwInvalidIcpModelInput = (detail: string): never => {
  throw new CommonQueryRunnerException(
    `Invalid ICP model: ${detail}`,
    CommonQueryRunnerExceptionCode.INVALID_ARGS_DATA,
    { userFriendlyMessage: msg`Invalid ICP model: ${detail}` },
  );
};

const assertValidIcpModelInput = (input: IcpModelInput): void => {
  const inputError = getIcpModelInputError(input);

  if (isDefined(inputError)) {
    throwInvalidIcpModelInput(inputError);
  }
};

const touchesLockedField = (data: IcpModelInput): boolean =>
  ICP_MODEL_LOCKED_FIELD_NAMES.some((fieldName) => fieldName in data);

@Injectable()
export class IcpModelValidationService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  // An upsert would update an existing model without the update checks.
  assertNotUpsert(upsert: boolean | undefined): void {
    if (upsert === true) {
      throwInvalidIcpModelInput('models cannot be upserted');
    }
  }

  prepareCreateData(data: IcpModelInput): IcpModelInput {
    const preparedData: IcpModelInput = {
      ...data,
      wonStages: data.wonStages ?? ICP_MODEL_DEFAULT_WON_STAGES,
      lostStages: data.lostStages ?? ICP_MODEL_DEFAULT_LOST_STAGES,
      criteria: data.criteria ?? [],
      tierThresholds: data.tierThresholds ?? DEFAULT_ICP_TIER_THRESHOLDS,
    };

    assertValidIcpModelInput(preparedData);

    return preparedData;
  }

  async assertValidUpdateOne({
    id,
    data,
    workspaceId,
  }: {
    id: string;
    data: IcpModelInput;
    workspaceId: string;
  }): Promise<void> {
    if (!touchesLockedField(data)) {
      assertValidIcpModelInput(data);

      return;
    }

    const existingModel = await this.findModel({ id, workspaceId });

    if (!isDefined(existingModel)) {
      assertValidIcpModelInput(data);

      return;
    }

    if (existingModel.status !== 'DRAFT') {
      throwInvalidIcpModelInput(
        'duplicate the model to change its criteria, stages or deal window; active and archived models keep theirs',
      );
    }

    assertValidIcpModelInput({
      wonStages: existingModel.wonStages,
      lostStages: existingModel.lostStages,
      datasetStartDate: existingModel.datasetStartDate,
      datasetEndDate: existingModel.datasetEndDate,
      ...data,
    });
  }

  assertValidUpdateMany(data: IcpModelInput): void {
    if (touchesLockedField(data)) {
      throwInvalidIcpModelInput(
        'change criteria, stages or the deal window one model at a time',
      );
    }

    assertValidIcpModelInput(data);
  }

  private async findModel({
    id,
    workspaceId,
  }: {
    id: string;
    workspaceId: string;
  }): Promise<IcpModelWorkspaceEntity | null> {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const icpModelRepository =
          await this.globalWorkspaceOrmManager.getRepository(
            workspaceId,
            IcpModelWorkspaceEntity,
            { shouldBypassPermissionChecks: true },
          );

        return icpModelRepository.findOneBy({ id });
      },
      buildSystemAuthContext(workspaceId),
    );
  }
}
