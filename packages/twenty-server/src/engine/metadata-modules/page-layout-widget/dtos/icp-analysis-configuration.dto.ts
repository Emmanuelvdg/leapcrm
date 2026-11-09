import { Field, ObjectType } from '@nestjs/graphql';

import { IsIn, IsNotEmpty } from 'class-validator';
import { type IcpAnalysisConfiguration } from 'twenty-shared/types';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';

@ObjectType('IcpAnalysisConfiguration')
export class IcpAnalysisConfigurationDTO implements IcpAnalysisConfiguration {
  @Field(() => WidgetConfigurationType)
  @IsIn([WidgetConfigurationType.ICP_ANALYSIS])
  @IsNotEmpty()
  configurationType: WidgetConfigurationType.ICP_ANALYSIS;
}
