const SPARQL_STRING_ESCAPES: Record<string, string> = {
  '\\': '\\\\',
  '"': '\\"',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

// User-supplied terms are embedded in a double-quoted SPARQL literal, so every
// character that could close or break the literal is escaped and other
// control characters are dropped.
export const escapeSparqlStringLiteral = (value: string): string =>
  value
    // oxlint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\\"\n\r\t]/g, (character) => SPARQL_STRING_ESCAPES[character]);
