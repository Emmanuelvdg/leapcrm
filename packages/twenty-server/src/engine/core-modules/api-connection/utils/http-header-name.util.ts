const HTTP_HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

const HTTP_HEADER_VALUE_FORBIDDEN_PATTERN = /[\r\n\0]/;

export const isValidHttpHeaderName = (name: string): boolean =>
  HTTP_HEADER_NAME_PATTERN.test(name);

export const isValidHttpHeaderValue = (value: string): boolean =>
  !HTTP_HEADER_VALUE_FORBIDDEN_PATTERN.test(value);

export const isSameHttpHeaderName = (left: string, right: string): boolean =>
  left.toLowerCase() === right.toLowerCase();
