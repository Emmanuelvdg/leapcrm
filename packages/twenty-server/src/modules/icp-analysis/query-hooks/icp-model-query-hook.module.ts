import { Module } from '@nestjs/common';

import { IcpModelCreateManyPreQueryHook } from 'src/modules/icp-analysis/query-hooks/icp-model-create-many.pre-query.hook';
import { IcpModelCreateOnePreQueryHook } from 'src/modules/icp-analysis/query-hooks/icp-model-create-one.pre-query.hook';
import { IcpModelUpdateManyPreQueryHook } from 'src/modules/icp-analysis/query-hooks/icp-model-update-many.pre-query.hook';
import { IcpModelUpdateOnePreQueryHook } from 'src/modules/icp-analysis/query-hooks/icp-model-update-one.pre-query.hook';
import { IcpModelValidationService } from 'src/modules/icp-analysis/services/icp-model-validation.service';

@Module({
  providers: [
    IcpModelValidationService,
    IcpModelCreateManyPreQueryHook,
    IcpModelCreateOnePreQueryHook,
    IcpModelUpdateManyPreQueryHook,
    IcpModelUpdateOnePreQueryHook,
  ],
})
export class IcpModelQueryHookModule {}
