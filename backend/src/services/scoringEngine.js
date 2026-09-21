// Transparent, configurable evidence scoring engine.
// This produces a SCORE, never a certainty. Every consumer must display:
// "This evidence score reflects consistency with reference data — it is not scientific certainty."

const DEFAULT_WEIGHTS = Object.freeze({
  visualMorphology: 0.35,
  mineralCharacteristics: 0.2,
  hardness: 0.15,
  density: 0.15,
  magnetism: 0.05,
  acidReaction: 0.05,
  uv: 0.05,
});

function assertWeightsSumToOne(weights) {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.001) {
    throw new Error(`Evidence weights must sum to 1.0, got ${sum.toFixed(3)}`);
  }
}

/**
 * evidence: { visualMorphology, mineralCharacteristics, hardness, density, magnetism, acidReaction, uv }
 *   each 0..1 or null (null = "missing information", excluded and weight redistributed
 *   proportionally among the remaining, present factors — never silently treated as 0,
 *   which would unfairly punish a sample with fewer completed tests).
 */
function computeEvidenceScore(evidence, weights = DEFAULT_WEIGHTS) {
  assertWeightsSumToOne(weights);

  const present = Object.entries(weights).filter(([key]) => evidence[key] !== null && evidence[key] !== undefined);
  const missing = Object.keys(weights).filter((key) => evidence[key] === null || evidence[key] === undefined);

  if (present.length === 0) {
    return {
      score: 0,
      confidenceLabel: 'INSUFFICIENT_DATA',
      missingFactors: missing,
      breakdown: {},
    };
  }

  const presentWeightSum = present.reduce((sum, [, w]) => sum + w, 0);
  const breakdown = {};
  let score = 0;
  for (const [key, weight] of present) {
    const normalizedWeight = weight / presentWeightSum; // redistribute missing weight
    const contribution = evidence[key] * normalizedWeight;
    breakdown[key] = { value: evidence[key], originalWeight: weight, normalizedWeight, contribution };
    score += contribution;
  }

  return {
    score: Math.round(score * 1000) / 1000, // 0..1
    confidenceLabel: labelForScore(score, missing.length),
    missingFactors: missing,
    breakdown,
  };
}

function labelForScore(score, missingCount) {
  // A large number of missing factors caps the label even with a high partial score,
  // because the score was computed over fewer real observations.
  if (missingCount >= 5) return 'INSUFFICIENT_DATA';
  if (score >= 0.75) return 'HIGH_CONFIDENCE';
  if (score >= 0.5) return 'MEDIUM_CONFIDENCE';
  if (score > 0) return 'LOW_CONFIDENCE';
  return 'INSUFFICIENT_DATA';
}

// ---------------------------------------------------------------------------
// Density: measured = mass / volume. Never rounded to imply false precision.
// ---------------------------------------------------------------------------
function computeDensity(massGrams, volumeCm3) {
  if (!massGrams || !volumeCm3 || volumeCm3 <= 0) return null;
  return Math.round((massGrams / volumeCm3) * 1000) / 1000; // g/cm3, 3 decimals
}

function densityCompatibility(measuredDensity, referenceMin, referenceMax) {
  if (measuredDensity === null || referenceMin === null || referenceMax === null) {
    return { compatible: null, reason: 'Insufficient data' };
  }
  const margin = (referenceMax - referenceMin) * 0.1; // 10% tolerance band
  const compatible = measuredDensity >= referenceMin - margin && measuredDensity <= referenceMax + margin;
  return {
    compatible,
    reason: compatible
      ? `Measured density ${measuredDensity} g/cm³ falls within the reference range ${referenceMin}-${referenceMax} g/cm³`
      : `Measured density ${measuredDensity} g/cm³ falls outside the reference range ${referenceMin}-${referenceMax} g/cm³`,
  };
}

// ---------------------------------------------------------------------------
// Mohs hardness assistant. Never returns false precision (e.g. "5.37").
// Input: an ordered list of scratch test results against reference materials
// (Talc=1 ... Diamond=10, plus common proxies: fingernail~2.5, copper coin~3.5,
// steel knife~5.5, glass~5.5, quartz=7 streak-plate/porcelain~6.5).
// ---------------------------------------------------------------------------
const MOHS_REFERENCE_POINTS = [
  { name: 'Talc', hardness: 1 },
  { name: 'Gypsum', hardness: 2 },
  { name: 'Fingernail', hardness: 2.5 },
  { name: 'Calcite', hardness: 3 },
  { name: 'Copper coin', hardness: 3.5 },
  { name: 'Fluorite', hardness: 4 },
  { name: 'Apatite', hardness: 5 },
  { name: 'Steel knife', hardness: 5.5 },
  { name: 'Glass', hardness: 5.5 },
  { name: 'Orthoclase', hardness: 6 },
  { name: 'Porcelain streak plate', hardness: 6.5 },
  { name: 'Quartz', hardness: 7 },
  { name: 'Topaz', hardness: 8 },
  { name: 'Corundum', hardness: 9 },
  { name: 'Diamond', hardness: 10 },
];

/**
 * results: [{ referenceName: 'Steel knife', outcome: 'scratches' | 'does_not_scratch' | 'uncertain' }]
 *   'scratches' = the reference material SCRATCHES the sample (reference is harder)
 *   'does_not_scratch' = the reference material fails to scratch the sample (sample is harder or equal)
 * Returns an interval, e.g. { min: 5, max: 6 }, or null if inconclusive.
 */
function estimateMohsInterval(results) {
  let hardestThatDidNotScratch = null; // sample is at least this hard
  let softestThatScratched = null; // sample is at most this hard

  for (const r of results) {
    const ref = MOHS_REFERENCE_POINTS.find((p) => p.name === r.referenceName);
    if (!ref || r.outcome === 'uncertain') continue;

    if (r.outcome === 'does_not_scratch') {
      if (hardestThatDidNotScratch === null || ref.hardness > hardestThatDidNotScratch) {
        hardestThatDidNotScratch = ref.hardness;
      }
    } else if (r.outcome === 'scratches') {
      if (softestThatScratched === null || ref.hardness < softestThatScratched) {
        softestThatScratched = ref.hardness;
      }
    }
  }

  if (hardestThatDidNotScratch === null && softestThatScratched === null) return null;

  const min = hardestThatDidNotScratch !== null ? hardestThatDidNotScratch : 1;
  const max = softestThatScratched !== null ? softestThatScratched : 10;

  if (min > max) {
    // Contradictory test results — flag rather than silently averaging.
    return { min: null, max: null, contradictory: true };
  }

  return { min, max, contradictory: false };
}

module.exports = {
  DEFAULT_WEIGHTS,
  computeEvidenceScore,
  labelForScore,
  computeDensity,
  densityCompatibility,
  estimateMohsInterval,
  MOHS_REFERENCE_POINTS,
};
