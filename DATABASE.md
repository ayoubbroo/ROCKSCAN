# DATABASE

ROCK ARCHIVE PRO uses a single local **SQLite** database on the device
(`rock_archive.db`, opened via `expo-sqlite`), initialized and migrated by
`mobile/src/db/database.ts`. The canonical schema lives at
`database/schema.sql` (mirrored, byte-for-byte, into
`mobile/src/db/schema.ts` so it can be embedded in the app bundle) and the
first migration is `database/migrations/001_initial_schema.sql`.

## Why SQLite, and why on-device

The product spec requires the archive to work fully offline — search, filter,
edit, delete, measurements, PDF/Excel export, QR codes. Keeping the
authoritative data on-device in real relational tables (not one JSON blob)
makes that possible and makes the search/filter/comparison SQL queries in
`mobile/src/db/repositories/*.ts` straightforward and fast.

## Tables

| Table | Purpose |
|---|---|
| `samples` | One row per specimen. Sequential `sample_code` (`ROCK-000001`, ...). |
| `photos` | Multiple photos per sample, tagged by `photo_type` (full/closeup/side/fracture/crystal_detail), with per-photo quality score. |
| `analyses` | One row per AI identification run against a sample (provider, model, validity flag, extracted visual features). |
| `candidates` | Ranked candidate identifications belonging to one `analyses` row, each with confidence + evidence. |
| `measurements` | Weight/dimensions/volume/computed density, always `USER_MEASURED`. |
| `tests` | Generic physical test results (hardness, streak, magnetism, acid, UV, conductivity, transparency, specific gravity) — `test_type` + `result_value` + optional structured `result_detail_json`. |
| `locations` | Optional collection location (country/region/city/coordinates/date) per sample. |
| `valuations` | Indicative value range per sample, always flagged `is_indicative = 1`. |
| `market_sources` | Manual (or vendor-sourced) comparable market entries backing a valuation. |
| `reports` | Record of every PDF/Excel file generated for a sample (for history/re-access). |
| `history` | Full timeline of events per sample (photo added, AI identification performed, density added, hardness test added, identification updated, ...). |
| `settings` | Key/value app settings (locale, currency, ...). |
| `reference_materials` | The curated, seeded geological knowledge base (see below) — read-only from the app's perspective. |

Full column definitions: see `database/schema.sql`.

## Data source tagging

Three columns/conventions enforce the "never blur reference data with real
measurements" requirement:

- `measurements.density_source` and `tests.source` are always `'USER_MEASURED'`.
- `candidates` rows come from AI output (`AI_OBSERVATION` context) and are
  cross-referenced (never merged) against `reference_materials`
  (`DATABASE_REFERENCE`) at query time in `backend/src/routes/analyze.js`.
- `reference_materials.source_reference` is mandatory and always cites a real
  source (e.g. "Klein & Hurlbut, Manual of Mineralogy", "USGS Mineral
  Resources Program", "Mindat.org").

## Seeding the reference database

On first launch (`schema_version` absent), `mobile/src/db/database.ts` calls
`seedReferenceMaterials()`, which loads `mobile/src/data/geology_reference.json`
(a duplicate, kept in sync, of `backend/data/geology_reference.json`) and
inserts ~20 curated minerals/rocks with real Mohs hardness, specific gravity,
crystal system, and diagnostic-feature data drawn from standard mineralogy
references. This is a starting reference set, not exhaustive — extend the
JSON file and re-run the seed (or add a new migration) to grow it.

## Migrations

`runMigrations()` in `database/database.ts` applies `schema.sql` (idempotent —
uses `CREATE TABLE IF NOT EXISTS`) and tracks a `schema_version` row. To add a
real migration later:

1. Add `database/migrations/00N_description.sql` with the new `ALTER TABLE`/
   `CREATE TABLE` statements.
2. In `mobile/src/db/database.ts`, add `if (versionRow.version < N) { ... }`
   applying the same statements, then bump the stored version.

## Backup / restore

`mobile/src/services/backupService.ts` copies the raw `.db` file out via
`expo-file-system` + `expo-sharing` (backup) and back in via
`expo-document-picker` (restore), so a full backup is a single portable file.
Restoring is destructive and always requires explicit user confirmation
(enforced in `SettingsScreen.tsx`).

## Excel export

`mobile/src/services/excelExport.ts` exports **one sheet per table**
(`Samples`, `Measurements`, `Analyses`, `Candidates`, `Tests`, `Valuations`,
`MarketSources`, `Locations`, `History`, `References`) into
`ROCK_ARCHIVE.xlsx` — never a single flattened sheet, per spec.
