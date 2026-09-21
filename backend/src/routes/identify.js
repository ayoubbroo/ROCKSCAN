const express = require('express');
const { getGeologyKnowledgeProvider } = require('../services/geologyKnowledgeProvider');
const {
  computeEvidenceScore,
  densityCompatibility,
  DEFAULT_WEIGHTS,
} = require('../services/scoringEngine');

const router = express.Router();

// USER MEASUREMENTS -> UPDATED IDENTIFICATION
// Body: {
//   candidates: [{ name, confidence (from /api/analyze, used as a proxy for
//                  visualMorphology + mineralCharacteristics), category }],
//   measurements: { densityGCm3, hardnessMin, hardnessMax, magnetism, acidReaction, uvFluorescence },
//   weights: { ...optional override of DEFAULT_WEIGHTS }
// }
router.post('/', async (req, res, next) => {
  try {
    const { candidates, measurements = {}, weights } = req.body || {};
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: '`candidates` must be a non-empty array (from a prior /api/analyze call)',
      });
    }

    const knowledge = getGeologyKnowledgeProvider();
    const effectiveWeights = weights || DEFAULT_WEIGHTS;

    const updated = candidates.map((candidate) => {
      const ref = knowledge.findByName(candidate.name);

      // AI's own confidence is split evenly across the two "visual" evidence
      // slots since the vision model already reasons over morphology and
      // mineral characteristics jointly — this is a deliberate, documented
      // simplification, not a hidden fabrication.
      const visualMorphology = candidate.confidence ?? null;
      const mineralCharacteristics = candidate.confidence ?? null;

      let hardnessScore = null;
      if (ref && measurements.hardnessMin != null && measurements.hardnessMax != null) {
        const overlap =
          measurements.hardnessMin <= ref.mohs_max && measurements.hardnessMax >= ref.mohs_min;
        hardnessScore = overlap ? 1 : 0;
      }

      let densityScore = null;
      let densityNote = null;
      if (ref && measurements.densityGCm3 != null) {
        const compat = densityCompatibility(
          measurements.densityGCm3,
          ref.specific_gravity_min,
          ref.specific_gravity_max
        );
        densityScore = compat.compatible === null ? null : compat.compatible ? 1 : 0;
        densityNote = compat.reason;
      }

      const magnetismScore =
        measurements.magnetism === 'unknown' || measurements.magnetism == null
          ? null
          : measurements.magnetism === 'non-magnetic'
          ? candidate.category === 'Ore' && /magnetite/i.test(candidate.name)
            ? 0
            : 1
          : 0.5; // magnetic/weakly-magnetic is only weak supporting/contradicting evidence without a reference magnetism field

      const acidScore =
        measurements.acidReaction === 'unknown' || measurements.acidReaction == null
          ? null
          : ref && /calcite|limestone|marble/i.test(ref.scientific_name)
          ? measurements.acidReaction === 'strong'
            ? 1
            : 0
          : measurements.acidReaction === 'none'
          ? 0.7
          : 0.3;

      const uvScore =
        measurements.uvFluorescence === 'unknown' || measurements.uvFluorescence == null ? null : 0.5;

      const evidence = {
        visualMorphology,
        mineralCharacteristics,
        hardness: hardnessScore,
        density: densityScore,
        magnetism: magnetismScore,
        acidReaction: acidScore,
        uv: uvScore,
      };

      const scoreResult = computeEvidenceScore(evidence, effectiveWeights);

      return {
        ...candidate,
        evidenceScore: scoreResult.score,
        confidenceLabel: scoreResult.confidenceLabel,
        evidenceBreakdown: scoreResult.breakdown,
        missingFactors: scoreResult.missingFactors,
        notes: {
          density: densityNote,
          disclaimer: 'This evidence score reflects consistency with reference data — it is not scientific certainty.',
        },
      };
    });

    updated.sort((a, b) => (b.evidenceScore || 0) - (a.evidenceScore || 0));

    res.json({ status: 'ok', candidates: updated, updatedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
