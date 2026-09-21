export type DataSource = 'DATABASE_REFERENCE' | 'AI_OBSERVATION' | 'USER_MEASURED';

export type Classification =
  | 'Mineral'
  | 'Igneous Rock'
  | 'Sedimentary Rock'
  | 'Metamorphic Rock'
  | 'Ore'
  | 'Gemstone'
  | 'Fossil'
  | 'Man-made material'
  | 'Unknown';

export type ConfidenceLabel = 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE' | 'INSUFFICIENT_DATA';

export interface Sample {
  id: number;
  sample_code: string; // ROCK-000001
  classification: Classification | null;
  probable_name: string | null;
  scientific_name: string | null;
  common_name: string | null;
  status: 'draft' | 'analyzed' | 'measured' | 'archived';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PhotoType = 'full' | 'closeup' | 'side' | 'fracture' | 'crystal_detail';

export interface Photo {
  id: number;
  sample_id: number;
  file_name: string;
  uri: string;
  photo_type: PhotoType;
  quality_score: number | null;
  quality_notes: string | null; // JSON string array
  taken_at: string;
}

export interface Analysis {
  id: number;
  sample_id: number;
  requested_at: string;
  ai_provider: string | null;
  ai_model: string | null;
  raw_response_valid: 0 | 1;
  visual_features_json: string | null;
  quality_score: number | null;
  status: 'pending' | 'ok' | 'failed' | 'rejected_low_quality';
}

export interface Candidate {
  id: number;
  analysis_id: number;
  rank: number;
  name: string;
  category: string | null;
  confidence: number;
  confidence_label: ConfidenceLabel;
  supporting_evidence_json: string | null;
  contradicting_evidence_json: string | null;
  reference_id: number | null;
}

export interface Measurement {
  id: number;
  sample_id: number;
  weight_g: number | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  volume_cm3: number | null;
  density_g_cm3: number | null;
  density_source: DataSource;
  recorded_at: string;
}

export type TestType =
  | 'hardness'
  | 'streak'
  | 'magnetism'
  | 'acid'
  | 'uv'
  | 'conductivity'
  | 'transparency'
  | 'specific_gravity';

export interface TestResult {
  id: number;
  sample_id: number;
  test_type: TestType;
  result_value: string;
  result_detail_json: string | null;
  source: DataSource;
  recorded_at: string;
}

export interface LocationRecord {
  id: number;
  sample_id: number;
  country: string | null;
  region: string | null;
  city: string | null;
  place_name: string | null;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_m: number | null;
  collection_date: string | null;
}

export interface Valuation {
  id: number;
  sample_id: number;
  currency: 'MAD' | 'USD' | 'EUR';
  low_estimate: number | null;
  high_estimate: number | null;
  basis_json: string | null;
  is_indicative: 0 | 1;
  created_at: string;
}

export interface MarketSource {
  id: number;
  valuation_id: number;
  source_name: string;
  source_date: string | null;
  price: number | null;
  currency: string | null;
  unit: string | null;
  condition: string | null;
  market_type: string | null;
  entered_manually: 0 | 1;
}

export interface ReportRecord {
  id: number;
  sample_id: number;
  report_type: 'pdf' | 'xlsx';
  file_uri: string | null;
  generated_at: string;
}

export interface HistoryEvent {
  id: number;
  sample_id: number;
  event_type: string;
  event_detail: string | null;
  created_at: string;
}

export interface ReferenceMaterial {
  id: number;
  scientific_name: string;
  common_name: string | null;
  synonyms_json: string | null;
  category: string;
  chemical_formula: string | null;
  crystal_system: string | null;
  mohs_min: number | null;
  mohs_max: number | null;
  specific_gravity_min: number | null;
  specific_gravity_max: number | null;
  luster: string | null;
  cleavage: string | null;
  fracture: string | null;
  streak: string | null;
  color_json: string | null;
  formation_environment: string | null;
  associated_materials_json: string | null;
  diagnostic_features: string | null;
  confusable_with_json: string | null;
  recommended_tests_json: string | null;
  common_uses: string | null;
  source_reference: string;
}
