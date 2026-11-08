import { type IcpAttributeCategory } from '@/icp-analysis/types/IcpAttributeCategory';
import { type IcpAttributeValueType } from '@/icp-analysis/types/IcpAttributeValueType';
import { type IcpNumericBand } from '@/icp-analysis/types/IcpNumericBand';

export type IcpAttributeDefinition = {
  key: string;
  label: string;
  category: IcpAttributeCategory;
  valueType: IcpAttributeValueType;
  valueLabels?: Record<string, string>;
  bands?: IcpNumericBand[];
};
