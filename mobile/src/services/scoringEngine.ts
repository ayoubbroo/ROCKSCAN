// Mirrors backend/src/services/scoringEngine.js exactly, so the mobile app can
// recompute scores offline (no network) whenever the user edits measurements.
// Keep both files in sync if you change the weights or formulas.

export interface EvidenceWeights {
  visualMorphology: number;
  mineralCharacteristics: number;
  hardness: number;
  density: number;
  magnetism: number;
  acidReaction: number;
  uv: number;
}

export const DEFAULT_WEIGHTS: EvidenceWeights = {
  visualMorphology: 0.35,
  mineralCharacteristics: 0.2,
  hardness: 0.15,
  density: 0.15,
  magnetism: 0.05,
  acidReaction: 0.05,
  uv: 0.05,
};

export type ConfidenceLabel = 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE' | 'INSUFFICIENT_DATA';

export interface EvidenceInput {
  visualMorphology: number | null;
  mineralCharacteristics: number | null;
  hardness: number | null;
  density: number | null;
  magnetism: number | null;
  acidReaction: number | null;
  uv: number | null;
}

export interface ScoreResult {
  score: number;
  confidenceLabel: ConfidenceLabel;
  missingFactors: string[];
  breakdown: Record<string, { value: number; originalWeight: number; normalizedWeight: number; contribution: number }>;
}

function assertWeightsSumToOne(weights: EvidenceWeights) {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.001) {
    throw new Error(`Evidence weights must sum to 1.0, got ${sum.toFixed(3)}`);
  }
}

export function computeEvidenceScore(evidence: EvidenceInput, weights: EvidenceWeights = DEFAULT_WEIGHTS): ScoreResult {
  assertWeightsSumToOne(weights);

  const entries = Object.entries(weights) as [keyof EvidenceWeights, number][];
  const present = entries.filter(([key]) => evidence[key] !== null && evidence[key] !== undefined);
  const missing = entries.filter(([key]) => evidence[key] === null || evidence[key] === undefined).map(([k]) => k);

  if (present.length === 0) {
    return { score: 0, confidenceLabel: 'INSUFFICIENT_DATA', missingFactors: missing, breakdown: {} };
  }

  const presentWeightSum = present.reduce((sum, [, w]) => sum + w, 0);
  const breakdown: ScoreResult['breakdown'] = {};
  let score = 0;
  for (const [key, weight] of present) {
    const normalizedWeight = weight / presentWeightSum;
    const value = evidence[key] as number;
    const contribution = value * normalizedWeight;
    breakdown[key] = { value, originalWeight: weight, normalizedWeight, contribution };
    score += contribution;
  }

  return {
    score: Math.round(score * 1000) / 1000,
    confidenceLabel: labelForScore(score, missing.length),
    missingFactors: missing,
    breakdown,
  };
}

export function labelForScore(score: number, missingCount: number): ConfidenceLabel {
  if (missingCount >= 5) return 'INSUFFICIENT_DATA';
  if (score >= 0.75) return 'HIGH_CONFIDENCE';
  if (score >= 0.5) return 'MEDIUM_CONFIDENCE';
  if (score > 0) return 'LOW_CONFIDENCE';
  return 'INSUFFICIENT_DATA';
}

export function computeDensity(massGrams: number | null, volumeCm3: number | null): number | null {
  if (!massGrams || !volumeCm3 || volumeCm3 <= 0) return null;
  return Math.round((massGrams / volumeCm3) * 1000) / 1000;
}

export function densityCompatibility(
  measuredDensity: number | null,
  referenceMin: number | null,
  referenceMax: number | null
): { compatible: boolean | null; reason: string } {
  if (measuredDensity === null || referenceMin === null || referenceMax === null) {
    return { compatible: null, reason: 'Insufficient data' };
  }
  const margin = (referenceMax - referenceMin) * 0.1;
  const compatible = measuredDensity >= referenceMin - margin && measuredDensity <= referenceMax + margin;
  return {
    compatible,
    reason: compatible
      ? `Measured density ${measuredDensity} g/cm³ falls within the reference range ${referenceMin}-${referenceMax} g/cm³`
      : `Measured density ${measuredDensity} g/cm³ falls outside the reference range ${referenceMin}-${referenceMax} g/cm³`,
  };
}

export interface MohsReferencePoint {
  name: string;
  hardness: number;
}

export const MOHS_REFERENCE_POINTS: MohsReferencePoint[] = [
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

export type ScratchOutcome = 'scratches' | 'does_not_scratch' | 'uncertain';

export interface MohsInterval {
  min: number | null;
  max: number | null;
  contradictory: boolean;
}

export function estimateMohsInterval(results: { referenceName: string; outcome: ScratchOutcome }[]): MohsInterval | null {
  let hardestThatDidNotScratch: number | null = null;
  let softestThatScratched: number | null = null;

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

  if (min > max) return { min: null, max: null, contradictory: true };
  return { min, max, contradictory: false };
}
