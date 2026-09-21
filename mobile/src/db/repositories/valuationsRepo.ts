import { getDb, nowIso } from '../database';
import { Valuation, MarketSource } from '../../types/models';
import { addHistoryEvent } from './historyRepo';

export async function addValuation(
  sampleId: number,
  data: {
    currency: 'MAD' | 'USD' | 'EUR';
    lowEstimate: number | null;
    highEstimate: number | null;
    basis: Record<string, unknown>;
  }
): Promise<Valuation> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO valuations (sample_id, currency, low_estimate, high_estimate, basis_json, is_indicative, created_at)
     VALUES (?,?,?,?,?,1,?)`,
    [sampleId, data.currency, data.lowEstimate, data.highEstimate, JSON.stringify(data.basis), nowIso()]
  );
  await addHistoryEvent(sampleId, 'valuation_added', { low: data.lowEstimate, high: data.highEstimate });
  return (await db.getFirstAsync<Valuation>(`SELECT * FROM valuations WHERE id = ?`, [
    result.lastInsertRowId,
  ])) as Valuation;
}

export async function addManualMarketSource(
  valuationId: number,
  entry: Omit<MarketSource, 'id' | 'valuation_id' | 'entered_manually'>
): Promise<MarketSource> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO market_sources (valuation_id, source_name, source_date, price, currency, unit, condition, market_type, entered_manually)
     VALUES (?,?,?,?,?,?,?,?,1)`,
    [
      valuationId,
      entry.source_name,
      entry.source_date,
      entry.price,
      entry.currency,
      entry.unit,
      entry.condition,
      entry.market_type,
    ]
  );
  return (await db.getFirstAsync<MarketSource>(`SELECT * FROM market_sources WHERE id = ?`, [
    result.lastInsertRowId,
  ])) as MarketSource;
}

export async function getValuationsForSample(sampleId: number): Promise<Valuation[]> {
  const db = await getDb();
  return db.getAllAsync<Valuation>(`SELECT * FROM valuations WHERE sample_id = ? ORDER BY created_at DESC`, [sampleId]);
}

export async function getMarketSourcesForValuation(valuationId: number): Promise<MarketSource[]> {
  const db = await getDb();
  return db.getAllAsync<MarketSource>(`SELECT * FROM market_sources WHERE valuation_id = ?`, [valuationId]);
}
