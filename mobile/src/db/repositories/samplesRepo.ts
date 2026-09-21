import { getDb, nowIso } from '../database';
import { Sample, Classification } from '../../types/models';
import { generateNextSampleCode } from '../../services/idGenerator';
import { addHistoryEvent } from './historyRepo';

export interface SampleFilters {
  query?: string;
  classification?: Classification;
  minConfidence?: number;
  dateFrom?: string;
  dateTo?: string;
}

export async function createSample(notes?: string): Promise<Sample> {
  const db = await getDb();
  const sampleCode = await generateNextSampleCode();
  const now = nowIso();
  const result = await db.runAsync(
    `INSERT INTO samples (sample_code, status, notes, created_at, updated_at) VALUES (?,?,?,?,?)`,
    [sampleCode, 'draft', notes ?? null, now, now]
  );
  const sample = await getSampleById(result.lastInsertRowId);
  await addHistoryEvent(result.lastInsertRowId, 'sample_created', { sampleCode });
  return sample as Sample;
}

export async function getSampleById(id: number): Promise<Sample | null> {
  const db = await getDb();
  return db.getFirstAsync<Sample>(`SELECT * FROM samples WHERE id = ?`, [id]);
}

export async function getSampleByCode(code: string): Promise<Sample | null> {
  const db = await getDb();
  return db.getFirstAsync<Sample>(`SELECT * FROM samples WHERE sample_code = ?`, [code]);
}

export async function updateSample(
  id: number,
  fields: Partial<Pick<Sample, 'classification' | 'probable_name' | 'scientific_name' | 'common_name' | 'status' | 'notes'>>
): Promise<void> {
  const db = await getDb();
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => (fields as any)[k]);
  await db.runAsync(`UPDATE samples SET ${setClause}, updated_at = ? WHERE id = ?`, [
    ...values,
    nowIso(),
    id,
  ]);
  await addHistoryEvent(id, 'identification_updated', fields);
}

export async function deleteSample(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM samples WHERE id = ?`, [id]);
}

export async function listSamples(filters: SampleFilters = {}): Promise<Sample[]> {
  const db = await getDb();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.query) {
    clauses.push(
      `(sample_code LIKE ? OR probable_name LIKE ? OR scientific_name LIKE ? OR common_name LIKE ? OR notes LIKE ?)`
    );
    const like = `%${filters.query}%`;
    params.push(like, like, like, like, like);
  }
  if (filters.classification) {
    clauses.push(`classification = ?`);
    params.push(filters.classification);
  }
  if (filters.dateFrom) {
    clauses.push(`created_at >= ?`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    clauses.push(`created_at <= ?`);
    params.push(filters.dateTo);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return db.getAllAsync<Sample>(`SELECT * FROM samples ${where} ORDER BY created_at DESC`, params);
}

export async function searchSamplesAdvanced(params: {
  query?: string;
  mineral?: string;
  rockType?: string;
  location?: string;
  minDensity?: number;
  maxDensity?: number;
  minHardness?: number;
  maxHardness?: number;
  minValue?: number;
  maxValue?: number;
}): Promise<Sample[]> {
  const db = await getDb();
  // Joins across measurements/locations/valuations for advanced search fields
  // (density, hardness, location, value range) requested by the product spec.
  let sql = `
    SELECT DISTINCT s.* FROM samples s
    LEFT JOIN measurements m ON m.sample_id = s.id
    LEFT JOIN tests t ON t.sample_id = s.id AND t.test_type = 'hardness'
    LEFT JOIN locations l ON l.sample_id = s.id
    LEFT JOIN valuations v ON v.sample_id = s.id
    WHERE 1=1
  `;
  const args: unknown[] = [];

  if (params.query) {
    sql += ` AND (s.sample_code LIKE ? OR s.probable_name LIKE ? OR s.scientific_name LIKE ?)`;
    const like = `%${params.query}%`;
    args.push(like, like, like);
  }
  if (params.mineral) {
    sql += ` AND s.scientific_name LIKE ?`;
    args.push(`%${params.mineral}%`);
  }
  if (params.rockType) {
    sql += ` AND s.classification LIKE ?`;
    args.push(`%${params.rockType}%`);
  }
  if (params.location) {
    sql += ` AND (l.city LIKE ? OR l.region LIKE ? OR l.country LIKE ? OR l.place_name LIKE ?)`;
    const like = `%${params.location}%`;
    args.push(like, like, like, like);
  }
  if (params.minDensity != null) {
    sql += ` AND m.density_g_cm3 >= ?`;
    args.push(params.minDensity);
  }
  if (params.maxDensity != null) {
    sql += ` AND m.density_g_cm3 <= ?`;
    args.push(params.maxDensity);
  }
  if (params.minValue != null) {
    sql += ` AND v.high_estimate >= ?`;
    args.push(params.minValue);
  }
  if (params.maxValue != null) {
    sql += ` AND v.low_estimate <= ?`;
    args.push(params.maxValue);
  }

  sql += ` ORDER BY s.created_at DESC`;
  return db.getAllAsync<Sample>(sql, args);
}
