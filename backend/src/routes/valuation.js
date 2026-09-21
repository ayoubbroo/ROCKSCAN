const express = require('express');
const { validateBody } = require('../middleware/validateRequest');
const { getMarketDataProvider, computeIndicativeRange, INDICATIVE_DISCLAIMER } = require('../services/marketDataProvider');

const router = express.Router();

router.post('/', validateBody('valuationRequest'), async (req, res, next) => {
  try {
    const { materialType, weightGrams, quality, rarity, currency = 'MAD', manualMarketEntries = [] } = req.body;

    const provider = getMarketDataProvider();
    const marketLookup = await provider.lookup({ materialType, quality, rarity });

    const computed = computeIndicativeRange({ weightGrams, quality, rarity, marketLookup, currency });

    res.json({
      status: 'ok',
      disclaimer: INDICATIVE_DISCLAIMER,
      marketDataAvailable: marketLookup.available,
      indicativeRange: computed,
      manualMarketEntries: manualMarketEntries.map((e) => ({ ...e, enteredManually: true })),
      note:
        manualMarketEntries.length > 0
          ? 'Indicative range may be refined manually using the market entries provided.'
          : 'No manual market entries provided. Add comparable sale sources (name, date, price, unit, condition) to refine this estimate.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
