export type IcpAttributeValue =
  | string
  | string[]
  | number
  | boolean
  | null
  | undefined;

export type IcpAttributeValues = Record<string, IcpAttributeValue>;
