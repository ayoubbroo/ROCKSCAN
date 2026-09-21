import { getDb, nowIso } from '../database';
import { Photo, PhotoType } from '../../types/models';
import { addHistoryEvent } from './historyRepo';

export async function addPhoto(
  sampleId: number,
  sampleCode: string,
  photoType: PhotoType,
  uri: string,
  sequence: number,
  qualityScore?: number,
  qualityNotes?: string[]
): Promise<Photo> {
  const db = await getDb();
  const fileName = `sample_${sampleCode}_photo_${String(sequence).padStart(2, '0')}.jpg`;
  const takenAt = nowIso();
  const result = await db.runAsync(
    `INSERT INTO photos (sample_id, file_name, uri, photo_type, quality_score, quality_notes, taken_at)
     VALUES (?,?,?,?,?,?,?)`,
    [sampleId, fileName, uri, photoType, qualityScore ?? null, qualityNotes ? JSON.stringify(qualityNotes) : null, takenAt]
  );
  await addHistoryEvent(sampleId, 'photo_added', { photoType, fileName });
  const photo = await db.getFirstAsync<Photo>(`SELECT * FROM photos WHERE id = ?`, [result.lastInsertRowId]);
  return photo as Photo;
}

export async function getPhotosForSample(sampleId: number): Promise<Photo[]> {
  const db = await getDb();
  return db.getAllAsync<Photo>(`SELECT * FROM photos WHERE sample_id = ? ORDER BY taken_at ASC`, [sampleId]);
}

export async function deletePhoto(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM photos WHERE id = ?`, [id]);
}
