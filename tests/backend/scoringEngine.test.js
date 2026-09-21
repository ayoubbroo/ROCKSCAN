const {
  computeEvidenceScore,
  labelForScore,
  DEFAULT_WEIGHTS,
} = require('../../backend/src/services/scoringEngine');

describe('computeEvidenceScore', () => {
  test('returns INSUFFICIENT_DATA when everything is missing', () => {
    const result = computeEvidenceScore({
      visualMorphology: null,
      mineralCharacteristics: null,
      hardness: null,
      density: null,
      magnetism: null,
      acidReaction: null,
      uv: null,
    });
    expect(result.confidenceLabel).toBe('INSUFFICIENT_DATA');
    expect(result.score).toBe(0);
  });

  test('redistributes weight of missing factors proportionally', () => {
    const result = computeEvidenceScore({
      visualMorphology: 1,
      mineralCharacteristics: 1,
      hardness: null,
      density: null,
      magnetism: null,
      acidReaction: null,
      uv: null,
    });
    // visualMorphology (0.35) + mineralCharacteristics (0.2) = 0.55 of total weight present
    // both are perfect (1.0), so normalized score should be 1.0
    expect(result.score).toBe(1);
    expect(result.confidenceLabel).toBe('HIGH_CONFIDENCE');
  });

  test('never returns confidence above what the weighted inputs justify', () => {
    const result = computeEvidenceScore({
      visualMorphology: 0.5,
      mineralCharacteristics: 0.5,
      hardness: 0.5,
      density: 0.5,
      magnetism: 0.5,
      acidReaction: 0.5,
      uv: 0.5,
    });
    expect(result.score).toBeCloseTo(0.5, 5);
    expect(result.confidenceLabel).toBe('MEDIUM_CONFIDENCE');
  });

  test('throws if custom weights do not sum to 1', () => {
    expect(() =>
      computeEvidenceScore(
        { visualMorphology: 1, mineralCharacteristics: null, hardness: null, density: null, magnetism: null, acidReaction: null, uv: null },
        { ...DEFAULT_WEIGHTS, visualMorphology: 0.9 }
      )
    ).toThrow();
  });

  test('caps label at INSUFFICIENT_DATA when 5+ factors missing even with a decent partial score', () => {
    const result = computeEvidenceScore({
      visualMorphology: 1,
      mineralCharacteristics: null,
      hardness: null,
      density: null,
      magnetism: null,
      acidReaction: null,
      uv: null,
    });
    expect(result.missingFactors.length).toBeGreaterThanOrEqual(5);
    expect(result.confidenceLabel).toBe('INSUFFICIENT_DATA');
  });
});

describe('labelForScore', () => {
  test.each([
    [0.9, 0, 'HIGH_CONFIDENCE'],
    [0.6, 0, 'MEDIUM_CONFIDENCE'],
    [0.2, 0, 'LOW_CONFIDENCE'],
    [0, 0, 'INSUFFICIENT_DATA'],
    [0.9, 5, 'INSUFFICIENT_DATA'],
  ])('score=%p missing=%p -> %p', (score, missing, expected) => {
    expect(labelForScore(score, missing)).toBe(expected);
  });
});
