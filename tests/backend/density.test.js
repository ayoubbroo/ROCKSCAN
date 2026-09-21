const { computeDensity, densityCompatibility } = require('../../backend/src/services/scoringEngine');

describe('computeDensity', () => {
  test('mass / volume, rounded to 3 decimals', () => {
    expect(computeDensity(26.7, 10)).toBe(2.67);
  });

  test('returns null when volume is zero or missing', () => {
    expect(computeDensity(10, 0)).toBeNull();
    expect(computeDensity(10, null)).toBeNull();
  });

  test('returns null when mass is missing', () => {
    expect(computeDensity(null, 10)).toBeNull();
  });

  test('never invents false precision beyond 3 decimals', () => {
    const d = computeDensity(1, 3);
    expect(d.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(3);
  });
});

describe('densityCompatibility', () => {
  test('compatible within reference range', () => {
    const result = densityCompatibility(2.65, 2.6, 2.65);
    expect(result.compatible).toBe(true);
  });

  test('compatible within 10% tolerance band just outside the range', () => {
    // range 2.6-2.65 -> margin = 0.005, so 2.654 should be compatible
    const result = densityCompatibility(2.654, 2.6, 2.65);
    expect(result.compatible).toBe(true);
  });

  test('incompatible far outside range', () => {
    const result = densityCompatibility(5.0, 2.6, 2.65);
    expect(result.compatible).toBe(false);
  });

  test('returns null compatibility when data is missing', () => {
    const result = densityCompatibility(null, 2.6, 2.65);
    expect(result.compatible).toBeNull();
  });
});
