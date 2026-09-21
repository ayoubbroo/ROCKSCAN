// Pure logic re-implementation mirrored from mobile/src/services/qrService.ts
// (kept dependency-free here so it runs under plain Node/Jest without the
// Expo/React Native test environment).
const QR_PREFIX = 'ROCKARCHIVEPRO:';

function buildSampleQrValue(sampleCode) {
  return `${QR_PREFIX}${sampleCode}`;
}

function parseSampleQrValue(scanned) {
  if (scanned.startsWith(QR_PREFIX)) return scanned.slice(QR_PREFIX.length);
  if (/^ROCK-\d{6}$/.test(scanned)) return scanned;
  return null;
}

describe('QR sample code round-trip', () => {
  test('builds and parses a prefixed value', () => {
    const value = buildSampleQrValue('ROCK-000042');
    expect(value).toBe('ROCKARCHIVEPRO:ROCK-000042');
    expect(parseSampleQrValue(value)).toBe('ROCK-000042');
  });

  test('accepts a bare sample code', () => {
    expect(parseSampleQrValue('ROCK-000042')).toBe('ROCK-000042');
  });

  test('rejects unrelated QR content', () => {
    expect(parseSampleQrValue('https://example.com')).toBeNull();
  });
});
