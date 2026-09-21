import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import geologyReferenceData from '../data/geology_reference.json';

const DB_NAME = 'rock_archive.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await runMigrations(dbInstance);
  return dbInstance;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  await db.execAsync(SCHEMA_SQL);

  const versionRow = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version WHERE id = 1'
  );

  if (!versionRow) {
    await db.runAsync('INSERT INTO schema_version (id, version) VALUES (1, 1)');
    await seedReferenceMaterials(db);
  }
  // Future migrations: bump the version, add `if (versionRow.version < N) { ... }` blocks here,
  // mirroring a new file in /database/migrations/.
}

async function seedReferenceMaterials(db: SQLite.SQLiteDatabase) {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM reference_materials'
  );
  if (existing && existing.count > 0) return;

  for (const m of geologyReferenceData.materials as any[]) {
    await db.runAsync(
      `INSERT INTO reference_materials (
        scientific_name, common_name, synonyms_json, category, chemical_formula,
        crystal_system, mohs_min, mohs_max, specific_gravity_min, specific_gravity_max,
        luster, cleavage, fracture, streak, color_json, formation_environment,
        associated_materials_json, diagnostic_features, confusable_with_json,
        recommended_tests_json, common_uses, source_reference
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        m.scientific_name,
        m.common_name ?? null,
        JSON.stringify(m.synonyms ?? []),
        m.category,
        m.chemical_formula ?? null,
        m.crystal_system ?? null,
        m.mohs_min ?? null,
        m.mohs_max ?? null,
        m.specific_gravity_min ?? null,
        m.specific_gravity_max ?? null,
        m.luster ?? null,
        m.cleavage ?? null,
        m.fracture ?? null,
        m.streak ?? null,
        JSON.stringify(m.colors ?? []),
        m.formation_environment ?? null,
        JSON.stringify(m.associated_materials ?? []),
        m.diagnostic_features ?? null,
        JSON.stringify(m.confusable_with ?? []),
        JSON.stringify(m.recommended_tests ?? []),
        m.common_uses ?? null,
        m.source_reference,
      ]
    );
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Wipes and re-creates the local database. Used by Settings > Restore only,
 * always behind an explicit user confirmation dialog. */
export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DROP TABLE IF EXISTS history;
    DROP TABLE IF EXISTS reports;
    DROP TABLE IF EXISTS market_sources;
    DROP TABLE IF EXISTS valuations;
    DROP TABLE IF EXISTS locations;
    DROP TABLE IF EXISTS tests;
    DROP TABLE IF EXISTS measurements;
    DROP TABLE IF EXISTS candidates;
    DROP TABLE IF EXISTS analyses;
    DROP TABLE IF EXISTS photos;
    DROP TABLE IF EXISTS samples;
    DROP TABLE IF EXISTS reference_materials;
    DROP TABLE IF EXISTS schema_version;
  `);
  dbInstance = null;
  await getDb();
}
