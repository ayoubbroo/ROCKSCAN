import { getDb, nowIso } from '../database';
import { ReportRecord } from '../../types/models';
import { addHistoryEvent } from './historyRepo';

export async function recordReport(
  sampleId: number,
  reportType: 'pdf' | 'xlsx',
  fileUri: string
): Promise<ReportRecord> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO reports (sample_id, report_type, file_uri, generated_at) VALUES (?,?,?,?)`,
    [sampleId, reportType, fileUri, nowIso()]
  );
  await addHistoryEvent(sampleId, `${reportType}_report_generated`, { fileUri });
  return (await db.getFirstAsync<ReportRecord>(`SELECT * FROM reports WHERE id = ?`, [
    result.lastInsertRowId,
  ])) as ReportRecord;
}

export async function getReportsForSample(sampleId: number): Promise<ReportRecord[]> {
  const db = await getDb();
  return db.getAllAsync<ReportRecord>(`SELECT * FROM reports WHERE sample_id = ? ORDER BY generated_at DESC`, [
    sampleId,
  ]);
}
