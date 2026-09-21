import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { colors, typography, spacing } from '../theme/colors';
import { t } from '../i18n';
import { useSettings } from '../context/SettingsContext';
import { getPhotosForSample } from '../db/repositories/photosRepo';
import { getSampleById, updateSample } from '../db/repositories/samplesRepo';
import { createAnalysis, addCandidates } from '../db/repositories/analysesRepo';
import { analyzeSpecimen } from '../services/api';

export default function AnalyzeScreen({ route, navigation }: any) {
  const { sampleId } = route.params;
  const { locale } = useSettings();
  const [status, setStatus] = useState<'loading' | 'error' | 'low_quality'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    runAnalysis();
  }, []);

  async function runAnalysis() {
    setStatus('loading');
    try {
      const photos = await getPhotosForSample(sampleId);
      if (photos.length === 0) throw new Error('No photos captured for this sample.');

      const encoded = await Promise.all(
        photos.map(async (p) => ({
          base64: await FileSystem.readAsStringAsync(p.uri, { encoding: FileSystem.EncodingType.Base64 }),
          mediaType: 'image/jpeg' as const,
          photoType: p.photo_type,
        }))
      );

      const sample = await getSampleById(sampleId);
      const result: any = await analyzeSpecimen(sample!.sample_code, encoded, locale);

      if (result.status === 'rejected_low_quality') {
        setStatus('low_quality');
        return;
      }

      const analysis = await createAnalysis(sampleId, {
        provider: result.provider,
        model: result.model,
        valid: true,
        visualFeatures: result.visualFeatures,
        qualityScore: result.imageQuality?.score,
        status: 'ok',
      });

      await addCandidates(
        analysis.id,
        result.candidates.map((c: any) => ({
          name: c.name,
          category: c.category,
          confidence: c.confidence,
          confidenceLabel: c.confidenceLabel,
          supportingEvidence: c.supportingEvidence,
          contradictingEvidence: c.contradictingEvidence,
        }))
      );

      await updateSample(sampleId, {
        classification: result.classification,
        probable_name: result.candidates[0]?.name ?? null,
        status: 'analyzed',
      });

      navigation.replace('Results', { sampleId, analysisId: analysis.id });
    } catch (e: any) {
      setErrorMessage(e.message || 'Unknown error');
      setStatus('error');
    }
  }

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.aqua} />
        <Text style={styles.loadingText}>{t('analysis.analyzing')}</Text>
      </View>
    );
  }

  if (status === 'low_quality') {
    return (
      <View style={styles.center}>
        <Text style={typography.h2}>{t('quality.insufficient_title')}</Text>
        <Text style={styles.message}>{t('quality.insufficient_message')}</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.replace('Capture', { sampleId })}>
          <Text style={styles.buttonText}>{t('capture.retake')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={typography.h2}>{t('common.error')}</Text>
      <Text style={styles.message}>{errorMessage}</Text>
      <Text style={styles.hint}>
        Check that the backend is running and ANTHROPIC_API_KEY is configured in backend/.env (see INSTALLATION.md).
      </Text>
      <TouchableOpacity style={styles.button} onPress={runAnalysis}>
        <Text style={styles.buttonText}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.offWhite },
  loadingText: { ...typography.body, marginTop: spacing.md },
  message: { ...typography.body, textAlign: 'center', marginTop: spacing.sm, color: colors.textSecondary },
  hint: { ...typography.caption, textAlign: 'center', marginTop: spacing.md },
  button: { backgroundColor: colors.navy, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 8, marginTop: spacing.lg },
  buttonText: { color: colors.white, fontWeight: '700' },
});
