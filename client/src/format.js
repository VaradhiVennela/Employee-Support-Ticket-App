const SAMPLE_TIMESTAMP = '2026-11-18T09:00:00.000Z';

export function formatWhen(iso, timestampOrigin) {
  const formatted = new Date(iso).toLocaleString('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
  const isSample = timestampOrigin === 'sample' && iso === SAMPLE_TIMESTAMP;
  return `${formatted} (${isSample ? 'sample data' : 'application time'})`;
}
