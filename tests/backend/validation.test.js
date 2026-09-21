const { validate } = require('../../backend/src/services/validation');

describe('analyzeRequest validation', () => {
  test('accepts a well-formed request', () => {
    const { valid } = validate('analyzeRequest', {
      sampleCode: 'ROCK-000001',
      photos: [{ base64: 'AAAAAAAAAA', mediaType: 'image/jpeg', photoType: 'full' }],
      language: 'fr',
    });
    expect(valid).toBe(true);
  });

  test('rejects a request with no photos', () => {
    const { valid } = validate('analyzeRequest', { sampleCode: 'ROCK-000001', photos: [] });
    expect(valid).toBe(false);
  });

  test('rejects an unsupported media type', () => {
    const { valid } = validate('analyzeRequest', {
      sampleCode: 'ROCK-000001',
      photos: [{ base64: 'AAAAAAAAAA', mediaType: 'image/gif', photoType: 'full' }],
    });
    expect(valid).toBe(false);
  });
});

describe('aiIdentificationResponse validation', () => {
  const validResponse = {
    imageQuality: { score: 80, sufficientForAnalysis: true, issues: [] },
    visualFeatures: { dominantColors: ['grey'] },
    classification: 'Mineral',
    candidates: [
      {
        name: 'Quartz',
        category: 'Mineral',
        confidence: 0.7,
        confidenceLabel: 'MEDIUM_CONFIDENCE',
        supportingEvidence: ['Vitreous luster'],
        contradictingEvidence: [],
      },
    ],
    recommendedTests: ['Hardness scratch test'],
  };

  test('accepts a well-formed AI response', () => {
    const { valid } = validate('aiIdentificationResponse', validResponse);
    expect(valid).toBe(true);
  });

  test('rejects a response with an invalid classification enum value', () => {
    const { valid } = validate('aiIdentificationResponse', { ...validResponse, classification: 'Space Rock' });
    expect(valid).toBe(false);
  });

  test('rejects confidence values outside 0..1 (no fabricated >100% confidence)', () => {
    const bad = {
      ...validResponse,
      candidates: [{ ...validResponse.candidates[0], confidence: 1.5 }],
    };
    const { valid } = validate('aiIdentificationResponse', bad);
    expect(valid).toBe(false);
  });

  test('rejects a response missing recommendedTests', () => {
    const { recommendedTests, ...withoutTests } = validResponse;
    const { valid } = validate('aiIdentificationResponse', withoutTests);
    expect(valid).toBe(false);
  });
});
