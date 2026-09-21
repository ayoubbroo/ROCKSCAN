# ARCHITECTURE

## High-level design

```
┌─────────────────────────┐        HTTPS/JSON        ┌───────────────────────────┐
│   Mobile app (Expo/RN)  │ ────────────────────────► │   Backend (Node/Express)  │
│                          │                            │                           │
│  • Offline SQLite        │ ◄──────────────────────── │  • AI Vision Provider     │
│    (samples, tests,      │     candidates, quality,   │    (Anthropic, swappable) │
│    measurements, ...)    │     evidence scores         │  • Geology Knowledge DB   │
│  • Camera / photo flow   │                            │  • Market Data Provider   │
│  • PDF/Excel export      │                            │  • Evidence Scoring       │
│  • QR generation/scan    │                            │  • Request/response       │
│  • i18n (FR/EN/AR, RTL)  │                            │    schema validation      │
└─────────────────────────┘                            └───────────────────────────┘
```

The **mobile app owns the archive** (SQLite, offline-first). The **backend is a
stateless service** that (a) proxies AI vision requests so the API key never
ships inside the app, and (b) serves the curated geological reference dataset
and valuation logic. This means:

- Viewing, searching, filtering, editing, deleting samples, running physical
  tests, generating PDF/Excel reports, and scanning QR codes all work **fully
  offline**.
- Only "identify this photo" and "look up a live market price" require the
  backend/network — and both fail loudly and honestly (never silently invent
  data) if unreachable or unconfigured.

## Workflow implemented end-to-end

```
PHOTO/CAMERA
  → IMAGE QUALITY CHECK (local heuristic pre-check, then authoritative check
     inside the AI response)
  → VISUAL FEATURE EXTRACTION (AI observation, tagged AI_OBSERVATION)
  → AI IDENTIFICATION (multiple ranked candidates, honest confidence)
  → GEOLOGICAL DATABASE COMPARISON (each candidate cross-referenced against
     the curated reference_materials table, tagged DATABASE_REFERENCE)
  → CANDIDATE IDENTIFICATIONS (with supporting/contradicting evidence)
  → CONFIDENCE ANALYSIS (evidence-weighted score, see below)
  → ADDITIONAL TEST RECOMMENDATIONS
  → USER MEASUREMENTS (weight, dimensions, density, hardness, magnetism,
     acid, UV — all tagged USER_MEASURED)
  → UPDATED IDENTIFICATION (POST /api/identify recomputes the evidence score
     using the real measurements)
  → ARCHIVE (SQLite, sequential ROCK-000001 IDs)
  → EXCEL / PDF REPORT
```

## Evidence scoring engine

Implemented identically in `backend/src/services/scoringEngine.js` (server,
authoritative for a fresh `/api/identify` call) and
`mobile/src/services/scoringEngine.ts` (client, so the UI can recompute
offline as the user fills in test results before syncing). Default weights:

| Factor | Weight |
|---|---|
| Visual morphology | 35% |
| Mineral characteristics | 20% |
| Hardness | 15% |
| Density | 15% |
| Magnetism | 5% |
| Acid reaction | 5% |
| UV fluorescence | 5% |

Missing factors are **excluded and their weight is redistributed
proportionally** among the present factors — a sample with fewer completed
tests is never unfairly penalized to zero, but 5+ missing factors caps the
label at `INSUFFICIENT_DATA` regardless of the partial score, since a
score computed over very little evidence isn't meaningful confidence.

## Provider abstractions

- `VisionProvider` (`backend/src/services/aiVisionProvider.js`) — the only
  class implemented today is `AnthropicVisionProvider`. Add a new class
  implementing the same `identifySpecimen({ photos, language })` contract and
  branch on it in `getVisionProvider()` to add OpenAI, a custom model, etc.
- `GeologyKnowledgeProvider` (`backend/src/services/geologyKnowledgeProvider.js`)
  — reads `backend/data/geology_reference.json`. Swap the file (or the class)
  for a live USGS/Mindat API integration later without touching the routes.
- `MarketDataProvider` (`backend/src/services/marketDataProvider.js`) — returns
  `{ available: false }` until you configure a real vendor; the mapping from
  vendor payload → price is deliberately left as a documented TODO in
  `ConfiguredMarketDataProvider.lookup()`, because guessing that mapping would
  mean inventing a price format that doesn't exist yet.

## Data integrity guarantees

- Every property shown in the UI carries an explicit source tag:
  `DATABASE_REFERENCE`, `AI_OBSERVATION`, or `USER_MEASURED` — never blended.
- The AI's JSON response is validated against a strict AJV schema
  (`backend/src/services/validation.js`) before any of it reaches the app. A
  malformed or out-of-range response (e.g. confidence > 1.0) is **rejected**,
  never "fixed" by guessing.
- Hardness is always reported as an interval derived from real scratch-test
  outcomes (e.g. "5–6"), never as false precision like "5.37".
- Valuation always carries the disclaimer "This is an indicative estimate,
  not a professional appraisal," and reports "Market price unavailable"
  rather than fabricating a number when no data source is configured.

## Mobile app layers

```
screens/          UI screens, one per workflow step
components/       Reusable UI (ConfidenceBadge, CandidateCard, EvidenceBar)
services/         Business logic — api client, scoring engine mirror,
                   image quality heuristic, PDF/Excel export, QR, backup
db/repositories/  One module per table — the only code that touches SQL
db/database.ts    Connection, migration runner, reference-data seeding
context/          App-wide settings (locale, currency) persisted to SQLite
i18n/             FR (default) / EN / AR translations + RTL handling
navigation/       React Navigation stack + tabs
```

## Future extension points (already accounted for)

- Cloud sync: the schema uses integer PKs today; adding a `remote_id`/`synced_at`
  column per table and a sync service is additive, no schema rewrite needed.
- Laboratory instruments (XRF/XRD/SEM-EDS): the `tests` table's `test_type`
  and `result_detail_json` columns are generic enough to store structured
  instrument output directly once a real integration exists.
- Additional AI providers: see `VisionProvider` above.
- Cloud market data: see `MarketDataProvider` above.
