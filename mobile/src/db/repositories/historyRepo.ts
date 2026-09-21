import { getDb, nowIso } from '../database';
import { HistoryEvent } from '../../types/models';

export async function addHistoryEvent(
  sampleId: number,
  eventType: string,
  detail?: Record<string, unknown> | string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO history (sample_id, event_type, event_detail, created_at) VALUES (?,?,?,?)`,
    [sampleId, eventType, detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : null, nowIso()]
  );
}

export async function getHistoryForSample(sampleId: number): Promise<HistoryEvent[]> {
  const db = await getDb();
  return db.getAllAsync<HistoryEvent>(
    `SELECT * FROM history WHERE sample_id = ? ORDER BY created_at ASC`,
    [sampleId]
  );
}
