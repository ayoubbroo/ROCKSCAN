const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, removeAdditional: 'failing' });
addFormats(ajv);

// ---------------------------------------------------------------------------
// Incoming request from the mobile app to POST /api/analyze
// ---------------------------------------------------------------------------
const analyzeRequestSchema = {
  type: 'object',
  required: ['sampleCode', 'photos'],
  properties: {
    sampleCode: { type: 'string', minLength: 1 },
    photos: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: {
        type: 'object',
        required: ['base64', 'mediaType', 'photoType'],
        properties: {
          base64: { type: 'string', minLength: 10 },
          mediaType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp'] },
          photoType: {
            type: 'string',
            enum: ['full', 'closeup', 'side', 'fracture', 'crystal_detail'],
          },
        },
      },
    },
    language: { type: 'string', enum: ['fr', 'en', 'ar'], default: 'fr' },
  },
  additionalProperties: false,
};

// ---------------------------------------------------------------------------
// STRICT schema the AI vision response must satisfy before we trust it.
// Anything that fails this validation is rejected outright (never patched
// with invented values) — the route handler returns a clear error instead.
// ---------------------------------------------------------------------------
const aiIdentificationResponseSchema = {
  type: 'object',
  required: ['imageQuality', 'visualFeatures', 'classification', 'candidates', 'recommendedTests'],
  properties: {
    imageQuality: {
      type: 'object',
      required: ['score', 'sufficientForAnalysis', 'issues'],
      properties: {
        score: { type: 'number', minimum: 0, maximum: 100 },
        sufficientForAnalysis: { type: 'boolean' },
        issues: { type: 'array', items: { type: 'string' } },
      },
    },
    visualFeatures: {
      type: 'object',
      properties: {
        dominantColors: { type: 'array', items: { type: 'string' } },
        secondaryColors: { type: 'array', items: { type: 'string' } },
        texture: { type: 'string' },
        grainSize: { type: 'string' },
        visibleCrystals: { type: 'boolean' },
        crystalShape: { type: 'string' },
        layering: { type: 'boolean' },
        foliation: { type: 'boolean' },
        banding: { type: 'boolean' },
        vesicles: { type: 'boolean' },
        pores: { type: 'boolean' },
        fractures: { type: 'string' },
        cleavageSurfaces: { type: 'boolean' },
        luster: { type: 'string' },
        translucency: { type: 'string' },
        weathering: { type: 'string' },
        metallicOrGlassyAppearance: { type: 'string' },
        sedimentaryStructures: { type: 'string' },
      },
      additionalProperties: true,
    },
    classification: {
      type: 'string',
      enum: [
        'Mineral', 'Igneous Rock', 'Sedimentary Rock', 'Metamorphic Rock',
        'Ore', 'Gemstone', 'Fossil', 'Man-made material', 'Unknown',
      ],
    },
    candidates: {
      type: 'array',
      minItems: 0,
      maxItems: 6,
      items: {
        type: 'object',
        required: ['name', 'confidence', 'confidenceLabel', 'supportingEvidence', 'contradictingEvidence'],
        properties: {
          name: { type: 'string' },
          category: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          confidenceLabel: {
            type: 'string',
            enum: ['HIGH_CONFIDENCE', 'MEDIUM_CONFIDENCE', 'LOW_CONFIDENCE', 'INSUFFICIENT_DATA'],
          },
          supportingEvidence: { type: 'array', items: { type: 'string' } },
          contradictingEvidence: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    recommendedTests: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  additionalProperties: true,
};

const valuationRequestSchema = {
  type: 'object',
  required: ['materialType', 'weightGrams', 'quality'],
  properties: {
    materialType: { type: 'string' },
    weightGrams: { type: 'number', minimum: 0 },
    dimensions: { type: 'string' },
    quality: { type: 'string' },
    condition: { type: 'string' },
    color: { type: 'string' },
    transparency: { type: 'string' },
    crystalQuality: { type: 'string' },
    origin: { type: 'string' },
    rarity: { type: 'string' },
    treatment: { type: 'string' },
    certification: { type: 'string' },
    marketCategory: { type: 'string' },
    currency: { type: 'string', enum: ['MAD', 'USD', 'EUR'], default: 'MAD' },
    manualMarketEntries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sourceName: { type: 'string' },
          sourceDate: { type: 'string' },
          price: { type: 'number' },
          currency: { type: 'string' },
          unit: { type: 'string' },
          condition: { type: 'string' },
          marketType: { type: 'string' },
        },
      },
    },
  },
  additionalProperties: false,
};

const referenceSearchRequestSchema = {
  type: 'object',
  properties: {
    query: { type: 'string' },
    category: { type: 'string' },
  },
  additionalProperties: false,
};

function compile(schema) {
  return ajv.compile(schema);
}

const validators = {
  analyzeRequest: compile(analyzeRequestSchema),
  aiIdentificationResponse: compile(aiIdentificationResponseSchema),
  valuationRequest: compile(valuationRequestSchema),
  referenceSearchRequest: compile(referenceSearchRequestSchema),
};

function validate(validatorName, data) {
  const validateFn = validators[validatorName];
  if (!validateFn) throw new Error(`Unknown validator: ${validatorName}`);
  const valid = validateFn(data);
  return { valid, errors: valid ? [] : validateFn.errors };
}

module.exports = { validate, validators };
