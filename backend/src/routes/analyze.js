const express = require('express');
const { validateBody } = require('../middleware/validateRequest');
const { getVisionProvider } = require('../services/aiVisionProvider');
const { getGeologyKnowledgeProvider } = require('../services/geologyKnowledgeProvider');

const router = express.Router();

// PHOTO -> IMAGE QUALITY CHECK -> VISUAL FEATURE EXTRACTION -> AI IDENTIFICATION
// -> GEOLOGICAL DATABASE COMPARISON -> CANDIDATE IDENTIFICATIONS
router.post('/', validateBody('analyzeRequest'), async (req, res, next) => {
  try {
    const { photos, language } = req.body;
    const provider = getVisionProvider();
    const { raw, provider: providerName, model } = await provider.identifySpecimen({ photos, language });

    if (!raw.imageQuality.sufficientForAnalysis) {
      return res.json({
        status: 'rejected_low_quality',
        imageQuality: raw.imageQuality,
        message: 'Image quality insufficient for reliable analysis. Please retake the photo(s).',
        provider: providerName,
        model,
      });
    }

    const knowledge = getGeologyKnowledgeProvider();
    const candidatesWithReference = raw.candidates.map((candidate) => {
      const referenceMatch = knowledge.findByName(candidate.name);
      return {
        ...candidate,
        reference: referenceMatch
          ? {
              source: 'DATABASE_REFERENCE',
              sourceReference: referenceMatch.source_reference,
              chemicalFormula: referenceMatch.chemical_formula,
              crystalSystem: referenceMatch.crystal_system,
              mohsRange: [referenceMatch.mohs_min, referenceMatch.mohs_max],
              specificGravityRange: [referenceMatch.specific_gravity_min, referenceMatch.specific_gravity_max],
              luster: referenceMatch.luster,
              cleavage: referenceMatch.cleavage,
              fracture: referenceMatch.fracture,
              streak: referenceMatch.streak,
              diagnosticFeatures: referenceMatch.diagnostic_features,
              confusableWith: referenceMatch.confusable_with,
              recommendedTests: referenceMatch.recommended_tests,
              commonUses: referenceMatch.common_uses,
            }
          : {
              source: 'DATABASE_REFERENCE',
              note: 'No matching entry in the local reference database for this candidate name. Reference properties: Not available.',
            },
      };
    });

    res.json({
      status: 'ok',
      provider: providerName,
      model,
      imageQuality: raw.imageQuality,
      visualFeatures: raw.visualFeatures,
      classification: raw.classification,
      candidates: candidatesWithReference,
      recommendedTests: raw.recommendedTests,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
