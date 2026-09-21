// The QR payload is intentionally just the sample code (e.g. "ROCK-000001"),
// not a URL — scanning inside the app resolves it locally against the
// offline SQLite archive, so it works with no network connection at all.
const QR_PREFIX = 'ROCKARCHIVEPRO:';

export function buildSampleQrValue(sampleCode: string): string {
  return `${QR_PREFIX}${sampleCode}`;
}

export function parseSampleQrValue(scanned: string): string | null {
  if (scanned.startsWith(QR_PREFIX)) {
    return scanned.slice(QR_PREFIX.length);
  }
  // Also accept a bare sample code, in case the QR was regenerated externally.
  if (/^ROCK-\d{6}$/.test(scanned)) {
    return scanned;
  }
  return null;
}
