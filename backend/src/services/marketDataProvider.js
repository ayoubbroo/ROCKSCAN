// MarketDataProvider: abstraction for (optional) live market pricing.
//
// IMPORTANT: no live pricing source ships by default. If MARKET_DATA_API_URL /
// MARKET_DATA_API_KEY are not set, every lookup returns
// { available: false, reason: 'Market price unavailable' } and the app falls
// back to manual entry (source, date, currency, price, unit, condition, market type),
// exactly as the product spec requires. Never invent a number here.

const { config } = require('../config/env');

class MarketDataProvider {
  // eslint-disable-next-line no-unused-vars
  async lookup({ materialType, quality, rarity }) {
    throw new Error('lookup() not implemented');
  }
}

class NullMarketDataProvider extends MarketDataProvider {
  async lookup() {
    return { available: false, reason: 'Market price unavailable', source: null };
  }
}

class ConfiguredMarketDataProvider extends MarketDataProvider {
  async lookup({ materialType, quality, rarity }) {
    try {
      const url = new URL(config.marketDataApiUrl);
      url.searchParams.set('material', materialType || '');
      if (quality) url.searchParams.set('quality', quality);
      if (rarity) url.searchParams.set('rarity', rarity);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${config.marketDataApiKey}` },
      });
      if (!response.ok) {
        return { available: false, reason: 'Market price unavailable', source: null };
      }
      const data = await response.json();
      // The shape of `data` depends entirely on the market data vendor you
      // configure. Map its real fields here — never fill in gaps with guesses.
      return { available: true, source: config.marketDataApiUrl, raw: data };
    } catch (e) {
      return { available: false, reason: 'Market price unavailable', source: null };
    }
  }
}

function getMarketDataProvider() {
  if (config.marketDataApiUrl && config.marketDataApiKey) {
    return new ConfiguredMarketDataProvider();
  }
  return new NullMarketDataProvider();
}

// Computes an INDICATIVE VALUE RANGE from user-entered inputs + optional
// market data. This is explicitly a heuristic, never a "price" — every
// consumer of this function must display the disclaimer string below.
const INDICATIVE_DISCLAIMER = 'This is an indicative estimate, not a professional appraisal.';

function computeIndicativeRange({ weightGrams, quality, rarity, marketLookup, currency = 'MAD' }) {
  if (!marketLookup || !marketLookup.available) {
    return {
      available: false,
      low: null,
      high: null,
      currency,
      disclaimer: INDICATIVE_DISCLAIMER,
      reason: 'Market price unavailable — enter a manual market reference to compute a range.',
    };
  }
  // A real implementation maps marketLookup.raw (vendor-specific) into a
  // per-unit price, then multiplies by weightGrams and applies quality/rarity
  // multipliers sourced from that same vendor payload — never invented here.
  return {
    available: true,
    low: null,
    high: null,
    currency,
    disclaimer: INDICATIVE_DISCLAIMER,
    reason: 'Vendor payload mapping not implemented — configure ConfiguredMarketDataProvider.lookup() mapping for your vendor.',
  };
}

module.exports = {
  MarketDataProvider,
  NullMarketDataProvider,
  ConfiguredMarketDataProvider,
  getMarketDataProvider,
  computeIndicativeRange,
  INDICATIVE_DISCLAIMER,
};
