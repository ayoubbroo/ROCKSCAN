import { getDb } from '../database';
import { LocationRecord } from '../../types/models';

export async function upsertLocation(
  sampleId: number,
  data: Partial<Omit<LocationRecord, 'id' | 'sample_id'>>
): Promise<LocationRecord> {
  const db = await getDb();
  const existing = await db.getFirstAsync<LocationRecord>(`SELECT * FROM locations WHERE sample_id = ?`, [sampleId]);

  if (existing) {
    const merged = { ...existing, ...data };
    await db.runAsync(
      `UPDATE locations SET country=?, region=?, city=?, place_name=?, latitude=?, longitude=?, gps_accuracy_m=?, collection_date=?
       WHERE sample_id = ?`,
      [
        merged.country, merged.region, merged.city, merged.place_name,
        merged.latitude, merged.longitude, merged.gps_accuracy_m, merged.collection_date,
        sampleId,
      ]
    );
    return (await db.getFirstAsync<LocationRecord>(`SELECT * FROM locations WHERE sample_id = ?`, [sampleId])) as LocationRecord;
  }

  const result = await db.runAsync(
    `INSERT INTO locations (sample_id, country, region, city, place_name, latitude, longitude, gps_accuracy_m, collection_date)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      sampleId,
      data.country ?? null, data.region ?? null, data.city ?? null, data.place_name ?? null,
      data.latitude ?? null, data.longitude ?? null, data.gps_accuracy_m ?? null, data.collection_date ?? null,
    ]
  );
  return (await db.getFirstAsync<LocationRecord>(`SELECT * FROM locations WHERE id = ?`, [result.lastInsertRowId])) as LocationRecord;
}

export async function getLocationForSample(sampleId: number): Promise<LocationRecord | null> {
  const db = await getDb();
  return db.getFirstAsync<LocationRecord>(`SELECT * FROM locations WHERE sample_id = ?`, [sampleId]);
}
