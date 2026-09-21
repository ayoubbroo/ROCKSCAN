import { getDb, nowIso } from '../database';
import { Analysis, Candidate, ConfidenceLabel } from '../../types/models';
import { addHistoryEvent } from './historyRepo';

export interface AiCandidateInput {
  name: string;
  category?: string;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  referenceId?: number | null;
}

export async function createAnalysis(
  sampleId: number,
  data: {
    provider?: string;
    model?: string;
    valid: boolean;
    visualFeatures?: Record<string, unknown>;
    qualityScore?: number;
    status: Analysis['status'];
  }
): Promise<Analysis> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO analyses (sample_id, requested_at, ai_provider, ai_model, raw_response_valid, visual_features_json, quality_score, status)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      sampleId,
      nowIso(),
      data.provider ?? null,
      data.model ?? null,
      data.valid ? 1 : 0,
      data.visualFeatures ? JSON.stringify(data.visualFeatures) : null,
      data.qualityScore ?? null,
      data.status,
    ]
  );
  await addHistoryEvent(sampleId, 'ai_identification_performed', { status: data.status, provider: data.provider });
  const analysis = await db.getFirstAsync<Analysis>(`SELECT * FROM analyses WHERE id = ?`, [result.lastInsertRowId]);
  return analysis as Analysis;
}

export async function addCandidates(analysisId: number, candidates: AiCandidateInput[]): Promise<Candidate[]> {
  const db = await getDb();
  const inserted: Candidate[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const result = await db.runAsync(
      `INSERT INTO candidates (analysis_id, rank, name, category, confidence, confidence_label, supporting_evidence_json, contradicting_evidence_json, reference_id)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        analysisId,
        i + 1,
        c.name,
        c.category ?? null,
        c.confidence,
        c.confidenceLabel,
        JSON.stringify(c.supportingEvidence ?? []),
        JSON.stringify(c.contradictingEvidence ?? []),
        c.referenceId ?? null,
      ]
    );
    const row = await db.getFirstAsync<Candidate>(`SELECT * FROM candidates WHERE id = ?`, [result.lastInsertRowId]);
    if (row) inserted.push(row);
  }
  return inserted;
}

export async function getLatestAnalysis(sampleId: number): Promise<Analysis | null> {
  const db = await getDb();
  return db.getFirstAsync<Analysis>(
    `SELECT * FROM analyses WHERE sample_id = ? ORDER BY requested_at DESC LIMIT 1`,
    [sampleId]
  );
}

export async function getCandidatesForAnalysis(analysisId: number): Promise<Candidate[]> {
  const db = await getDb();
  return db.getAllAsync<Candidate>(`SELECT * FROM candidates WHERE analysis_id = ? ORDER BY rank ASC`, [analysisId]);
}
