import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDb } from '../db/database';
import { recordReport } from '../db/repositories/reportsRepo';

/**
 * Exports the COMPLETE local archive to ROCK_ARCHIVE.xlsx with one sheet per
 * table, as required by the spec — never a single flattened/simplified sheet.
 */
export async function exportArchiveToExcel(): Promise<string> {
  const db = await getDb();

  const [samples, measurements, analyses, candidates, tests, valuations, marketSources, locations, history, references] =
    await Promise.all([
      db.getAllAsync(`SELECT * FROM samples ORDER BY id`),
      db.getAllAsync(`SELECT * FROM measurements ORDER BY sample_id`),
      db.getAllAsync(`SELECT * FROM analyses ORDER BY sample_id`),
      db.getAllAsync(
        `SELECT c.* FROM candidates c JOIN analyses a ON a.id = c.analysis_id ORDER BY a.sample_id, c.rank`
      ),
      db.getAllAsync(`SELECT * FROM tests ORDER BY sample_id`),
      db.getAllAsync(`SELECT * FROM valuations ORDER BY sample_id`),
      db.getAllAsync(
        `SELECT ms.* FROM market_sources ms JOIN valuations v ON v.id = ms.valuation_id ORDER BY v.sample_id`
      ),
      db.getAllAsync(`SELECT * FROM locations ORDER BY sample_id`),
      db.getAllAsync(`SELECT * FROM history ORDER BY sample_id, created_at`),
      db.getAllAsync(`SELECT * FROM reference_materials ORDER BY scientific_name`),
    ]);

  const workbook = XLSX.utils.book_new();
  const addSheet = (name: string, rows: any[]) => {
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ info: 'No data' }]);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  };

  addSheet('Samples', samples);
  addSheet('Measurements', measurements);
  addSheet('Analyses', analyses);
  addSheet('Candidates', candidates);
  addSheet('Tests', tests);
  addSheet('Valuations', valuations);
  addSheet('MarketSources', marketSources);
  addSheet('Locations', locations);
  addSheet('History', history);
  addSheet('References', references);

  const wbBase64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const fileUri = `${FileSystem.documentDirectory}ROCK_ARCHIVE_${Date.now()}.xlsx`;
  await FileSystem.writeAsStringAsync(fileUri, wbBase64, { encoding: FileSystem.EncodingType.Base64 });

  return fileUri;
}

export async function exportAndShareArchive(): Promise<void> {
  const fileUri = await exportArchiveToExcel();
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'ROCK_ARCHIVE.xlsx',
    });
  }
}

/** Exports a single sample's full record set (for the sample detail screen). */
export async function exportSampleToExcel(sampleId: number): Promise<string> {
  const db = await getDb();
  const [sample, measurements, tests, valuations, locations, history] = await Promise.all([
    db.getAllAsync(`SELECT * FROM samples WHERE id = ?`, [sampleId]),
    db.getAllAsync(`SELECT * FROM measurements WHERE sample_id = ?`, [sampleId]),
    db.getAllAsync(`SELECT * FROM tests WHERE sample_id = ?`, [sampleId]),
    db.getAllAsync(`SELECT * FROM valuations WHERE sample_id = ?`, [sampleId]),
    db.getAllAsync(`SELECT * FROM locations WHERE sample_id = ?`, [sampleId]),
    db.getAllAsync(`SELECT * FROM history WHERE sample_id = ?`, [sampleId]),
  ]);

  const workbook = XLSX.utils.book_new();
  const addSheet = (name: string, rows: any[]) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ info: 'No data' }]), name);
  };
  addSheet('Sample', sample);
  addSheet('Measurements', measurements);
  addSheet('Tests', tests);
  addSheet('Valuations', valuations);
  addSheet('Locations', locations);
  addSheet('History', history);

  const wbBase64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const code = (sample[0] as any)?.sample_code ?? `sample_${sampleId}`;
  const fileUri = `${FileSystem.documentDirectory}${code}_export.xlsx`;
  await FileSystem.writeAsStringAsync(fileUri, wbBase64, { encoding: FileSystem.EncodingType.Base64 });
  await recordReport(sampleId, 'xlsx', fileUri);
  return fileUri;
}
