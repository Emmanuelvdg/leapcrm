const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const formatRelativeTime = (
  isoDate: string,
  now: Date = new Date(),
): string => {
  const elapsedMs = now.getTime() - Date.parse(isoDate);

  if (Number.isNaN(elapsedMs)) {
    return '';
  }

  if (elapsedMs < MINUTE_MS) {
    return 'just now';
  }

  if (elapsedMs < HOUR_MS) {
    const minutes = Math.floor(elapsedMs / MINUTE_MS);

    return `${minutes} min ago`;
  }

  if (elapsedMs < DAY_MS) {
    const hours = Math.floor(elapsedMs / HOUR_MS);

    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  const days = Math.floor(elapsedMs / DAY_MS);

  return days === 1 ? 'yesterday' : `${days} days ago`;
};
