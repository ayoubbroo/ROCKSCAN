// VisionProvider abstraction.
//
// The rest of the app only ever talks to `identifySpecimen(...)`. Swapping
// providers (Anthropic -> OpenAI -> a custom fine-tuned model -> a future
// on-device model) means writing a new class that implements the same
// interface and selecting it in `getVisionProvider()`. Nothing else changes.

const { config } = require('../config/env');
const { validate } = require('./validation');

class VisionProvider {
  // eslint-disable-next-line no-unused-vars
  async identifySpecimen({ photos, language }) {
    throw new Error('identifySpecimen() not implemented');
  }
}

const SYSTEM_PROMPT = `You are a geological identification assistant embedded in a scientific
archiving application called ROCK ARCHIVE PRO. You analyze photographs of rock, mineral,
gemstone, ore, or fossil specimens.

STRICT RULES — violating any of these makes your response useless to the application:
1. Respond with ONLY a single JSON object. No prose, no markdown fences, no preamble.
2. Never invent a precise measurement (exact hardness number, exact density, exact
   chemical percentage) that cannot actually be determined from a photograph. Photographs
   can support qualitative and comparative reasoning (color, luster, habit, texture,
   structure) — not lab-grade quantitative data.
3. Always propose MULTIPLE candidates (up to 6) when the evidence is ambiguous, each
   with an honest confidence value and explicit supporting AND contradicting evidence.
4. Never assign confidence 1.0 unless the specimen is unambiguous AND diagnostic AND
   the image quality is excellent (say so explicitly in supportingEvidence if you do).
5. If the image is blurry, too dark, overexposed, low resolution, obstructed, or shows
   insufficient surface area, set imageQuality.sufficientForAnalysis to false and explain
   why in imageQuality.issues — do not force an identification on a bad image.
6. classification must be exactly one of: Mineral, Igneous Rock, Sedimentary Rock,
   Metamorphic Rock, Ore, Gemstone, Fossil, Man-made material, Unknown.
7. Always populate recommendedTests with the laboratory or field tests (e.g. "Mohs
   hardness scratch test", "Dilute HCl acid test", "Streak test", "XRF", "XRD",
   "Specific gravity measurement") that would help narrow down the identification.
8. Respond in the requested language for all free-text fields (dominant colors,
   evidence strings, issues, recommended tests) while keeping all JSON keys and enums
   in English exactly as specified.

Return JSON matching exactly this shape:
{
  "imageQuality": { "score": 0-100, "sufficientForAnalysis": true|false, "issues": ["..."] },
  "visualFeatures": {
    "dominantColors": ["..."], "secondaryColors": ["..."], "texture": "...",
    "grainSize": "...", "visibleCrystals": true|false, "crystalShape": "...",
    "layering": true|false, "foliation": true|false, "banding": true|false,
    "vesicles": true|false, "pores": true|false, "fractures": "...",
    "cleavageSurfaces": true|false, "luster": "...", "translucency": "...",
    "weathering": "...", "metallicOrGlassyAppearance": "...", "sedimentaryStructures": "..."
  },
  "classification": "Mineral|Igneous Rock|Sedimentary Rock|Metamorphic Rock|Ore|Gemstone|Fossil|Man-made material|Unknown",
  "candidates": [
    {
      "name": "...", "category": "...", "confidence": 0.0-1.0,
      "confidenceLabel": "HIGH_CONFIDENCE|MEDIUM_CONFIDENCE|LOW_CONFIDENCE|INSUFFICIENT_DATA",
      "supportingEvidence": ["..."], "contradictingEvidence": ["..."]
    }
  ],
  "recommendedTests": ["..."]
}`;

class AnthropicVisionProvider extends VisionProvider {
  async identifySpecimen({ photos, language = 'fr' }) {
    if (!config.anthropicApiKey) {
      const err = new Error('AI provider not configured: ANTHROPIC_API_KEY is missing');
      err.code = 'PROVIDER_NOT_CONFIGURED';
      throw err;
    }

    const imageBlocks = photos.map((p) => ({
      type: 'image',
      source: { type: 'base64', media_type: p.mediaType, data: p.base64 },
    }));

    const userContent = [
      ...imageBlocks,
      {
        type: 'text',
        text: `Analyze these ${photos.length} photo(s) of one physical specimen. Respond in ${language}. Return ONLY the JSON object described in your instructions.`,
      },
    ];

    const response = await fetch(config.anthropicApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.anthropicModel,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const err = new Error(`AI provider request failed (${response.status}): ${body.slice(0, 500)}`);
      err.code = 'PROVIDER_REQUEST_FAILED';
      throw err;
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    if (!textBlock) {
      const err = new Error('AI provider returned no text content');
      err.code = 'PROVIDER_EMPTY_RESPONSE';
      throw err;
    }

    let parsed;
    try {
      const cleaned = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const err = new Error('AI provider response was not valid JSON — rejected, not repaired');
      err.code = 'PROVIDER_MALFORMED_JSON';
      throw err;
    }

    const { valid, errors } = validate('aiIdentificationResponse', parsed);
    if (!valid) {
      const err = new Error('AI provider response failed schema validation — rejected');
      err.code = 'PROVIDER_SCHEMA_INVALID';
      err.details = errors;
      throw err;
    }

    return { raw: parsed, provider: 'anthropic', model: config.anthropicModel };
  }
}

// Add alternate provider classes here (OpenAIVisionProvider, etc.) implementing
// the same identifySpecimen({ photos, language }) contract, then branch below.
function getVisionProvider() {
  switch (config.aiProvider) {
    case 'anthropic':
    default:
      return new AnthropicVisionProvider();
  }
}

module.exports = { VisionProvider, AnthropicVisionProvider, getVisionProvider };
