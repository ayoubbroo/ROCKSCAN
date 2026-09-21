import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../theme/colors';
import { t } from '../i18n';
import CandidateCard from '../components/CandidateCard';
import { getCandidatesForAnalysis } from '../db/repositories/analysesRepo';
import { getSampleById } from '../db/repositories/samplesRepo';
import { Candidate, Sample } from '../types/models';

export default function ResultsScreen({ route, navigation }: any) {
  const { sampleId, analysisId } = route.params;
  const [sample, setSample] = useState<Sample | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    (async () => {
      setSample(await getSampleById(sampleId));
      setCandidates(await getCandidatesForAnalysis(analysisId));
    })();
  }, [sampleId, analysisId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
      <Text style={styles.code}>{sample?.sample_code}</Text>
      <Text style={typography.h1}>{t('analysis.classification')}</Text>
      <Text style={styles.classification}>{sample?.classification || t('analysis.not_determinable')}</Text>

      <Text style={[typography.h2, { marginTop: spacing.lg }]}>{t('analysis.candidates')}</Text>
      <Text style={styles.disclaimer}>{t('analysis.disclaimer')}</Text>

      {candidates.map((c) => (
        <CandidateCard
          key={c.id}
          rank={c.rank}
          name={c.name}
          category={c.category}
          confidence={c.confidence}
          confidenceLabel={c.confidence_label}
          supportingEvidence={JSON.parse(c.supporting_evidence_json || '[]')}
          contradictingEvidence={JSON.parse(c.contradicting_evidence_json || '[]')}
        />
      ))}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Measurements', { sampleId, analysisId })}
      >
        <Text style={styles.primaryButtonText}>{t('measurements.title')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('SampleDetail', { sampleId })}
      >
        <Text style={styles.secondaryButtonText}>{t('sample.id')}: {sample?.sample_code}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  code: { ...typography.label, color: colors.aqua, marginBottom: spacing.xs },
  classification: { ...typography.h2, color: colors.deepBlue, marginBottom: spacing.md },
  disclaimer: { ...typography.caption, fontStyle: 'italic', marginBottom: spacing.md },
  primaryButton: { backgroundColor: colors.navy, padding: spacing.md, borderRadius: 8, alignItems: 'center', marginTop: spacing.lg },
  primaryButtonText: { color: colors.white, fontWeight: '700' },
  secondaryButton: { padding: spacing.md, borderRadius: 8, alignItems: 'center', marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.textPrimary, fontWeight: '600' },
});
