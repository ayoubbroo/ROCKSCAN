# API

Base URL: configured via `API_BASE_URL` (backend `.env`) and
`expo.extra.apiBaseUrl` (mobile `app.json`). All endpoints are under `/api`.

Every response either succeeds with `"status": "ok"` (or similar) or fails
with an HTTP error status and a JSON body `{ "error": "<CODE>", "message": "...",
"details"?: [...] }`. The backend never silently returns fabricated data.

---

## GET /api/health

Returns service status and whether the AI provider / market data provider are
configured.

```json
{
  "status": "ok",
  "service": "rock-archive-pro-backend",
  "aiProvider": "anthropic",
  "aiProviderConfigured": true,
  "marketDataConfigured": false,
  "warnings": [],
  "timestamp": "2026-09-21T10:00:00.000Z"
}
```

---

## POST /api/analyze

Runs image quality check, visual feature extraction, AI identification, and
geological database cross-referencing.

**Request:**
```json
{
  "sampleCode": "ROCK-000001",
  "language": "fr",
  "photos": [
    { "base64": "<base64 jpeg>", "mediaType": "image/jpeg", "photoType": "full" },
    { "base64": "<base64 jpeg>", "mediaType": "image/jpeg", "photoType": "closeup" }
  ]
}
```

`photoType` ∈ `full | closeup | side | fracture | crystal_detail`. 1–6 photos.

**Response (success):**
```json
{
  "status": "ok",
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "imageQuality": { "score": 82, "sufficientForAnalysis": true, "issues": [] },
  "visualFeatures": { "dominantColors": ["grey", "white"], "luster": "vitreous", "...": "..." },
  "classification": "Mineral",
  "candidates": [
    {
      "name": "Quartz",
      "category": "Mineral",
      "confidence": 0.72,
      "confidenceLabel": "MEDIUM_CONFIDENCE",
      "supportingEvidence": ["Vitreous luster", "Conchoidal fracture"],
      "contradictingEvidence": ["No visible crystal faces"],
      "reference": {
        "source": "DATABASE_REFERENCE",
        "sourceReference": "Klein & Hurlbut, Manual of Mineralogy; Mindat.org",
        "mohsRange": [7, 7],
        "specificGravityRange": [2.6, 2.65],
        "...": "..."
      }
    }
  ],
  "recommendedTests": ["Hardness scratch test", "Acid test", "Specific gravity"],
  "analyzedAt": "2026-09-21T10:00:00.000Z"
}
```

**Response (low quality — no identification attempted):**
```json
{
  "status": "rejected_low_quality",
  "imageQuality": { "score": 22, "sufficientForAnalysis": false, "issues": ["too_dark", "blurry"] },
  "message": "Image quality insufficient for reliable analysis. Please retake the photo(s)."
}
```

**Errors:** `400 INVALID_REQUEST` (schema failure) · `503 PROVIDER_NOT_CONFIGURED`
(no API key) · `502 PROVIDER_REQUEST_FAILED` / `PROVIDER_MALFORMED_JSON` /
`PROVIDER_SCHEMA_INVALID` (the AI call failed or returned something the app
refuses to trust).

---

## POST /api/identify

Recomputes ranked candidates using the evidence-weighted scoring engine, given
the candidates from a prior `/api/analyze` call plus real user measurements.

**Request:**
```json
{
  "candidates": [
    { "name": "Quartz", "category": "Mineral", "confidence": 0.72 }
  ],
  "measurements": {
    "densityGCm3": 2.63,
    "hardnessMin": 6,
    "hardnessMax": 7,
    "magnetism": "non-magnetic",
    "acidReaction": "none",
    "uvFluorescence": "none"
  }
}
```

**Response:**
```json
{
  "status": "ok",
  "candidates": [
    {
      "name": "Quartz",
      "evidenceScore": 0.81,
      "confidenceLabel": "HIGH_CONFIDENCE",
      "evidenceBreakdown": { "visualMorphology": { "value": 0.72, "...": "..." } },
      "missingFactors": ["uv"],
      "notes": {
        "density": "Measured density 2.63 g/cm³ falls within the reference range 2.6-2.65 g/cm³",
        "disclaimer": "This evidence score reflects consistency with reference data — it is not scientific certainty."
      }
    }
  ],
  "updatedAt": "2026-09-21T10:05:00.000Z"
}
```

---

## POST /api/valuation

Returns an indicative value range (never a "price"), or explicitly
"Market price unavailable" when no live pricing source is configured.

**Request:**
```json
{
  "materialType": "Amethyst geode",
  "weightGrams": 340,
  "quality": "good",
  "rarity": "common",
  "currency": "MAD",
  "manualMarketEntries": [
    { "sourceName": "Local mineral fair", "sourceDate": "2026-08-01", "price": 250, "currency": "MAD", "unit": "per_piece", "condition": "good", "marketType": "retail" }
  ]
}
```

**Response:**
```json
{
  "status": "ok",
  "disclaimer": "This is an indicative estimate, not a professional appraisal.",
  "marketDataAvailable": false,
  "indicativeRange": {
    "available": false,
    "low": null,
    "high": null,
    "currency": "MAD",
    "disclaimer": "This is an indicative estimate, not a professional appraisal.",
    "reason": "Market price unavailable — enter a manual market reference to compute a range."
  },
  "manualMarketEntries": [{ "...": "...", "enteredManually": true }],
  "note": "Indicative range may be refined manually using the market entries provided."
}
```

---

## POST /api/reference-search

Searches the curated geological knowledge base.

**Request:** `{ "query": "quartz", "category": "Mineral" }` (both optional)

**Response:** `{ "status": "ok", "count": 1, "results": [ { "scientific_name": "Quartz", "...": "...", "source": "DATABASE_REFERENCE" } ] }`
