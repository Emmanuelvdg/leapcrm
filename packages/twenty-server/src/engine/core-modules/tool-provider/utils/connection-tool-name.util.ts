// Tool names must be unique across every connection in the workspace: the
// sanitized connection name alone can collide, so a short slice of the
// connection id is appended. Dispatch uses `executionRef.toolId`
// (`${connectionId}::${toolName}`) instead, so the name only has to be
// readable, not reversible.
const MAX_TOOL_NAME_LENGTH = 64;
const CONNECTION_ID_SUFFIX_LENGTH = 8;

export const CONNECTION_TOOL_ID_SEPARATOR = '::';

export const sanitizeToolNameSegment = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const buildConnectionToolName = ({
  connectionId,
  connectionName,
  toolName,
}: {
  connectionId: string;
  connectionName: string;
  toolName: string;
}): string => {
  const suffix = connectionId
    .replace(/-/g, '')
    .slice(0, CONNECTION_ID_SUFFIX_LENGTH);
  let connectionSegment = sanitizeToolNameSegment(connectionName);
  let toolSegment = sanitizeToolNameSegment(toolName);

  const budget = MAX_TOOL_NAME_LENGTH - suffix.length - 2;
  const overflow = connectionSegment.length + toolSegment.length - budget;

  // Model providers reject tool names over 64 characters; names that fit are
  // left exactly as before so existing MCP tool names stay stable.
  if (overflow > 0) {
    connectionSegment = connectionSegment.slice(
      0,
      Math.max(8, connectionSegment.length - overflow),
    );
    toolSegment = toolSegment.slice(0, budget - connectionSegment.length);
  }

  return `${connectionSegment}_${toolSegment}_${suffix}`;
};

export const buildConnectionToolId = (
  connectionId: string,
  toolName: string,
): string => `${connectionId}${CONNECTION_TOOL_ID_SEPARATOR}${toolName}`;

export const parseConnectionToolId = (
  toolId: string,
): { connectionId: string; toolName: string } | null => {
  const separatorIndex = toolId.indexOf(CONNECTION_TOOL_ID_SEPARATOR);

  if (separatorIndex === -1) {
    return null;
  }

  return {
    connectionId: toolId.slice(0, separatorIndex),
    toolName: toolId.slice(
      separatorIndex + CONNECTION_TOOL_ID_SEPARATOR.length,
    ),
  };
};
