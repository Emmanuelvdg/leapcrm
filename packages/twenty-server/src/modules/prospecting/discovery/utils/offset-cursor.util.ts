import { DiscoveryProviderException } from 'src/modules/prospecting/discovery/exceptions/discovery-provider.exception';

const OFFSET_CURSOR_PATTERN = /^\d+$/;

export const parseOffsetCursor = (cursor: string | null): number => {
  if (cursor === null) {
    return 0;
  }

  if (!OFFSET_CURSOR_PATTERN.test(cursor)) {
    throw new DiscoveryProviderException(
      `Invalid discovery cursor ${cursor}`,
      'UNSUPPORTED_DISCOVERY_REQUEST',
    );
  }

  return Number(cursor);
};

// A short page means the source has nothing left for this query.
export const buildNextOffsetCursor = ({
  offset,
  pageSize,
  receivedCount,
}: {
  offset: number;
  pageSize: number;
  receivedCount: number;
}): string | null =>
  receivedCount < pageSize ? null : String(offset + pageSize);
