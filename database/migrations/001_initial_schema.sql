-- ROCK ARCHIVE PRO — Canonical SQLite schema
-- Applied on the device (offline-first) via mobile/src/db/database.ts
-- Mirrors database/migrations/001_initial_schema.sql exactly.
-- All monetary/measurement values are stored as TEXT/REAL with an explicit
-- "source" column (DATABASE_REFERENCE | AI_OBSERVATION | USER_MEASURED)
-- so the UI can never blur reference data with real measurements.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL
);

-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_code TEXT UNIQUE NOT NULL,          -- ROCK-000001
  classification TEXT,                        -- Mineral / Igneous Rock / ... / Unknown
  probable_name TEXT,
  scientific_name TEXT,
  common_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',       -- draft | analyzed | measured | archived
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,                    -- sample_ROCK-000001_photo_01.jpg
  uri TEXT NOT NULL,
  photo_type TEXT NOT NULL,                   -- full | closeup | side | fracture | crystal_detail
  quality_score REAL,
  quality_notes TEXT,                         -- JSON array of detected issues
  taken_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  requested_at TEXT NOT NULL,
  ai_provider TEXT,
  ai_model TEXT,
  raw_response_valid INTEGER NOT NULL DEFAULT 0,
  visual_features_json TEXT,                  -- extracted colors/texture/etc, source=AI_OBSERVATION
  quality_score REAL,
  status TEXT NOT NULL DEFAULT 'pending'       -- pending | ok | failed | rejected_low_quality
);

CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT,                              -- Mineral | Rock | Gemstone | Fossil | ...
  confidence REAL NOT NULL,                   -- 0..1, never hard-coded to 1.0 without justification
  confidence_label TEXT NOT NULL,             -- HIGH | MEDIUM | LOW | INSUFFICIENT_DATA
  supporting_evidence_json TEXT,
  contradicting_evidence_json TEXT,
  reference_id INTEGER REFERENCES reference_materials(id)
);

CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  weight_g REAL,
  length_mm REAL,
  width_mm REAL,
  height_mm REAL,
  volume_cm3 REAL,
  density_g_cm3 REAL,                         -- computed = weight_g / volume_cm3
  density_source TEXT NOT NULL DEFAULT 'USER_MEASURED',
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,                    -- hardness | streak | magnetism | acid | uv | conductivity | transparency | specific_gravity
  result_value TEXT NOT NULL,                 -- e.g. "5-6", "Weak reaction", "Non-magnetic"
  result_detail_json TEXT,                    -- e.g. scratch matrix for hardness
  source TEXT NOT NULL DEFAULT 'USER_MEASURED',
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  country TEXT,
  region TEXT,
  city TEXT,
  place_name TEXT,
  latitude REAL,
  longitude REAL,
  gps_accuracy_m REAL,
  collection_date TEXT
);

CREATE TABLE IF NOT EXISTS valuations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'MAD',
  low_estimate REAL,
  high_estimate REAL,
  basis_json TEXT,                            -- inputs used: weight/quality/rarity/etc
  is_indicative INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS market_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  valuation_id INTEGER NOT NULL REFERENCES valuations(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_date TEXT,
  price REAL,
  currency TEXT,
  unit TEXT,                                  -- per_gram | per_carat | per_piece
  condition TEXT,
  market_type TEXT,                           -- retail | wholesale | auction | collector
  entered_manually INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,                  -- pdf | xlsx
  file_uri TEXT,
  generated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,                   -- photo_added | ai_identification | density_added | hardness_added | identification_updated | ...
  event_detail TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Structured geological knowledge base (seeded from backend/data/geology_reference.json)
CREATE TABLE IF NOT EXISTS reference_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scientific_name TEXT NOT NULL,
  common_name TEXT,
  synonyms_json TEXT,
  category TEXT NOT NULL,                     -- Mineral | Igneous Rock | Sedimentary Rock | Metamorphic Rock | Ore | Gemstone
  chemical_formula TEXT,
  crystal_system TEXT,
  mohs_min REAL,
  mohs_max REAL,
  specific_gravity_min REAL,
  specific_gravity_max REAL,
  luster TEXT,
  cleavage TEXT,
  fracture TEXT,
  streak TEXT,
  color_json TEXT,
  formation_environment TEXT,
  associated_materials_json TEXT,
  diagnostic_features TEXT,
  confusable_with_json TEXT,
  recommended_tests_json TEXT,
  common_uses TEXT,
  source_reference TEXT NOT NULL              -- e.g. "Mindat.org", "USGS Mineral Resources", "Klein & Hurlbut, Manual of Mineralogy"
);

CREATE INDEX IF NOT EXISTS idx_samples_code ON samples(sample_code);
CREATE INDEX IF NOT EXISTS idx_photos_sample ON photos(sample_id);
CREATE INDEX IF NOT EXISTS idx_analyses_sample ON analyses(sample_id);
CREATE INDEX IF NOT EXISTS idx_candidates_analysis ON candidates(analysis_id);
CREATE INDEX IF NOT EXISTS idx_measurements_sample ON measurements(sample_id);
CREATE INDEX IF NOT EXISTS idx_tests_sample ON tests(sample_id);
CREATE INDEX IF NOT EXISTS idx_locations_sample ON locations(sample_id);
CREATE INDEX IF NOT EXISTS idx_valuations_sample ON valuations(sample_id);
CREATE INDEX IF NOT EXISTS idx_history_sample ON history(sample_id);
CREATE INDEX IF NOT EXISTS idx_reference_name ON reference_materials(scientific_name);

INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, 1);
