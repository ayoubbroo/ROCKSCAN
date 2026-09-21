import { getDb, nowIso } from '../database';
import { Measurement } from '../../types/models';
import { addHistoryEvent } from './historyRepo';
import { computeDensity } from '../../services/scoringEngine';

export async function addMeasurement(
  sampleId: number,
  data: {
    weightG?: number;
    lengthMm?: number;
    widthMm?: number;
    heightMm?: number;
    volumeCm3?: number;
  }
): Promise<Measurement> {
  const db = await getDb();
  const density = computeDensity(data.weightG ?? null, data.volumeCm3 ?? null);
  const result = await db.runAsync(
    `INSERT INTO measurements (sample_id, weight_g, length_mm, width_mm, height_mm, volume_cm3, density_g_cm3, density_source, recorded_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      sampleId,
      data.weightG ?? null,
      data.lengthMm ?? null,
      data.widthMm ?? null,
      data.heightMm ?? null,
      data.volumeCm3 ?? null,
      density,
      'USER_MEASURED',
      nowIso(),
    ]
  );
  await addHistoryEvent(sampleId, 'density_added', { density });
  const measurement = await db.getFirstAsync<Measurement>(`SELECT * FROM measurements WHERE id = ?`, [
    result.lastInsertRowId,
  ]);
  return measurement as Measurement;
}

export async function getMeasurementsForSample(sampleId: number): Promise<Measurement[]> {
  const db = await getDb();
  return db.getAllAsync<Measurement>(
    `SELECT * FROM measurements WHERE sample_id = ? ORDER BY recorded_at DESC`,
    [sampleId]
  );
}

export async function getLatestMeasurement(sampleId: number): Promise<Measurement | null> {
  const db = await getDb();
  return db.getFirstAsync<Measurement>(
    `SELECT * FROM measurements WHERE sample_id = ? ORDER BY recorded_at DESC LIMIT 1`,
    [sampleId]
  );
}
