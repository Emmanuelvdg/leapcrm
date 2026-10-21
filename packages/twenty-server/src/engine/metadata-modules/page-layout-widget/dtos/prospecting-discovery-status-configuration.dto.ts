import { Field, ObjectType } from '@nestjs/graphql';

import { IsIn, IsNotEmpty } from 'class-validator';
import { type ProspectingDiscoveryStatusConfiguration } from 'twenty-shared/types';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';

@ObjectType('ProspectingDiscoveryStatusConfiguration')
export class ProspectingDiscoveryStatusConfigurationDTO implements ProspectingDiscoveryStatusConfiguration {
  @Field(() => WidgetConfigurationType)
  @IsIn([WidgetConfigurationType.PROSPECTING_DISCOVERY_STATUS])
  @IsNotEmpty()
  configurationType: WidgetConfigurationType.PROSPECTING_DISCOVERY_STATUS;
}
