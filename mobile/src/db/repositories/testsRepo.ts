import { getDb, nowIso } from '../database';
import { TestResult, TestType } from '../../types/models';
import { addHistoryEvent } from './historyRepo';

export async function addTestResult(
  sampleId: number,
  testType: TestType,
  resultValue: string,
  detail?: Record<string, unknown>
): Promise<TestResult> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO tests (sample_id, test_type, result_value, result_detail_json, source, recorded_at)
     VALUES (?,?,?,?,?,?)`,
    [sampleId, testType, resultValue, detail ? JSON.stringify(detail) : null, 'USER_MEASURED', nowIso()]
  );
  await addHistoryEvent(sampleId, `${testType}_test_added`, { resultValue });
  const row = await db.getFirstAsync<TestResult>(`SELECT * FROM tests WHERE id = ?`, [result.lastInsertRowId]);
  return row as TestResult;
}

export async function getTestsForSample(sampleId: number): Promise<TestResult[]> {
  const db = await getDb();
  return db.getAllAsync<TestResult>(`SELECT * FROM tests WHERE sample_id = ? ORDER BY recorded_at DESC`, [sampleId]);
}

export async function getLatestTestByType(sampleId: number, testType: TestType): Promise<TestResult | null> {
  const db = await getDb();
  return db.getFirstAsync<TestResult>(
    `SELECT * FROM tests WHERE sample_id = ? AND test_type = ? ORDER BY recorded_at DESC LIMIT 1`,
    [sampleId, testType]
  );
}
