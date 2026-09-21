import { getDb } from '../db/database';

export async function generateNextSampleCode(): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ sample_code: string }>(
    `SELECT sample_code FROM samples ORDER BY id DESC LIMIT 1`
  );
  let nextNumber = 1;
  if (row?.sample_code) {
    const match = row.sample_code.match(/ROCK-(\d+)/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  return `ROCK-${String(nextNumber).padStart(6, '0')}`;
}
