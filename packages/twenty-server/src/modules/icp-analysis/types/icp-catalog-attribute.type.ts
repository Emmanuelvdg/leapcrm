import { type IcpAttributeDefinition } from 'twenty-shared/icp-analysis';
import { type FieldMetadataType } from 'twenty-shared/types';

export type IcpCatalogAttributeSource = {
  fieldName: string;
  fieldType: FieldMetadataType;
};

export type IcpCatalogAttribute = IcpAttributeDefinition & {
  source: IcpCatalogAttributeSource;
};
