import { getDb } from '../database';
import { ReferenceMaterial } from '../../types/models';

export async function findReferenceByName(name: string): Promise<ReferenceMaterial | null> {
  const db = await getDb();
  return db.getFirstAsync<ReferenceMaterial>(
    `SELECT * FROM reference_materials WHERE scientific_name = ? OR common_name = ? LIMIT 1`,
    [name, name]
  );
}

export async function searchReferences(query: string, category?: string): Promise<ReferenceMaterial[]> {
  const db = await getDb();
  const like = `%${query}%`;
  if (category) {
    return db.getAllAsync<ReferenceMaterial>(
      `SELECT * FROM reference_materials
       WHERE category = ? AND (scientific_name LIKE ? OR common_name LIKE ? OR diagnostic_features LIKE ?)
       ORDER BY scientific_name ASC`,
      [category, like, like, like]
    );
  }
  return db.getAllAsync<ReferenceMaterial>(
    `SELECT * FROM reference_materials
     WHERE scientific_name LIKE ? OR common_name LIKE ? OR diagnostic_features LIKE ?
     ORDER BY scientific_name ASC`,
    [like, like, like]
  );
}

export async function getAllReferences(): Promise<ReferenceMaterial[]> {
  const db = await getDb();
  return db.getAllAsync<ReferenceMaterial>(`SELECT * FROM reference_materials ORDER BY scientific_name ASC`);
}
