import { Field, ObjectType } from '@nestjs/graphql';

import { IsIn, IsNotEmpty } from 'class-validator';
import { type ConversationsConfiguration } from 'twenty-shared/types';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';

@ObjectType('ConversationsConfiguration')
export class ConversationsConfigurationDTO
  implements ConversationsConfiguration
{
  @Field(() => WidgetConfigurationType)
  @IsIn([WidgetConfigurationType.CONVERSATIONS])
  @IsNotEmpty()
  configurationType: WidgetConfigurationType.CONVERSATIONS;
}
