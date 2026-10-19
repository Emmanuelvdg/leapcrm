import { DiscoveryProviderException } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';

// Providers that query one search term at a time page through each term in
// turn; the cursor records which term and which page come next.
export type TermPageCursor = {
  termIndex: number;
  pageNumber: number;
};

const TERM_PAGE_CURSOR_PATTERN = /^(\d+):(\d+)$/;

export const parseTermPageCursor = (cursor: string | null): TermPageCursor => {
  if (cursor === null) {
    return { termIndex: 0, pageNumber: 1 };
  }

  const match = TERM_PAGE_CURSOR_PATTERN.exec(cursor);

  if (!match || Number(match[2]) < 1) {
    throw new DiscoveryProviderException(
      `Invalid discovery cursor ${cursor}`,
      'UNSUPPORTED_DISCOVERY_REQUEST',
    );
  }

  return { termIndex: Number(match[1]), pageNumber: Number(match[2]) };
};

export const buildNextTermPageCursor = ({
  termIndex,
  pageNumber,
  hasMorePages,
  termCount,
}: TermPageCursor & {
  hasMorePages: boolean;
  termCount: number;
}): string | null => {
  if (hasMorePages) {
    return `${termIndex}:${pageNumber + 1}`;
  }

  if (termIndex + 1 < termCount) {
    return `${termIndex + 1}:1`;
  }

  return null;
};
