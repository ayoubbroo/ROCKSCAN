const { estimateMohsInterval } = require('../../backend/src/services/scoringEngine');

describe('estimateMohsInterval', () => {
  test('steel knife scratches, quartz does not -> interval between steel and quartz', () => {
    const interval = estimateMohsInterval([
      { referenceName: 'Steel knife', outcome: 'scratches' },
      { referenceName: 'Quartz', outcome: 'does_not_scratch' },
    ]);
    // sample is at least as hard as quartz (7) since quartz did not scratch it... wait:
    // "does_not_scratch" means quartz FAILED to scratch -> sample is at least as hard as quartz (min=7)
    // "scratches" means steel knife DID scratch -> sample is at most as hard as steel (max=5.5)
    // This is contradictory (min 7 > max 5.5) and must be flagged, not silently resolved.
    expect(interval.contradictory).toBe(true);
  });

  test('consistent results produce a valid interval', () => {
    // Steel knife scratches the sample -> sample <= 5.5
    // Fingernail does NOT scratch the sample -> sample >= 2.5
    const interval = estimateMohsInterval([
      { referenceName: 'Steel knife', outcome: 'scratches' },
      { referenceName: 'Fingernail', outcome: 'does_not_scratch' },
    ]);
    expect(interval.contradictory).toBe(false);
    expect(interval.min).toBe(2.5);
    expect(interval.max).toBe(5.5);
  });

  test('uncertain results are ignored', () => {
    const interval = estimateMohsInterval([{ referenceName: 'Quartz', outcome: 'uncertain' }]);
    expect(interval).toBeNull();
  });

  test('never returns false precision like 5.37', () => {
    const interval = estimateMohsInterval([
      { referenceName: 'Steel knife', outcome: 'scratches' },
      { referenceName: 'Fingernail', outcome: 'does_not_scratch' },
    ]);
    // Result must be one of the fixed reference hardness values, never an
    // arbitrarily precise decimal implying instrument-grade measurement.
    const allowedValues = [1, 2, 2.5, 3, 3.5, 4, 5, 5.5, 6, 6.5, 7, 8, 9, 10];
    expect(allowedValues).toContain(interval.min);
    expect(allowedValues).toContain(interval.max);
  });
});
