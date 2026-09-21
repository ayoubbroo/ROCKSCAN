import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors, typography, spacing } from '../theme/colors';
import { t } from '../i18n';
import { addMeasurement } from '../db/repositories/measurementsRepo';
import { addTestResult } from '../db/repositories/testsRepo';
import { computeDensity } from '../services/scoringEngine';
import { getCandidatesForAnalysis } from '../db/repositories/analysesRepo';
import { getLatestTestByType } from '../db/repositories/testsRepo';
import { refineIdentification } from '../services/api';

type ThreeState = 'unknown' | 'none' | 'weak' | 'strong';

export default function MeasurementsScreen({ route, navigation }: any) {
  const { sampleId, analysisId } = route.params;
  const [weightG, setWeightG] = useState('');
  const [lengthMm, setLengthMm] = useState('');
  const [widthMm, setWidthMm] = useState('');
  const [heightMm, setHeightMm] = useState('');
  const [volumeCm3, setVolumeCm3] = useState('');
  const [magnetism, setMagnetism] = useState<ThreeState>('unknown');
  const [acid, setAcid] = useState<ThreeState>('unknown');
  const [uv, setUv] = useState<ThreeState>('unknown');
  const [saving, setSaving] = useState(false);

  const parsedWeight = weightG ? parseFloat(weightG) : null;
  const parsedVolume = volumeCm3 ? parseFloat(volumeCm3) : null;
  const density = computeDensity(parsedWeight, parsedVolume);

  const save = async () => {
    setSaving(true);
    try {
      await addMeasurement(sampleId, {
        weightG: parsedWeight ?? undefined,
        lengthMm: lengthMm ? parseFloat(lengthMm) : undefined,
        widthMm: widthMm ? parseFloat(widthMm) : undefined,
        heightMm: heightMm ? parseFloat(heightMm) : undefined,
        volumeCm3: parsedVolume ?? undefined,
      });

      if (magnetism !== 'unknown') {
        await addTestResult(sampleId, 'magnetism', mapThreeStateLabel('magnetism', magnetism));
      }
      if (acid !== 'unknown') {
        await addTestResult(sampleId, 'acid', mapThreeStateLabel('acid', acid));
      }
      if (uv !== 'unknown') {
        await addTestResult(sampleId, 'uv', mapThreeStateLabel('uv', uv));
      }

      const hardnessTest = await getLatestTestByType(sampleId, 'hardness');
      const hardnessDetail = hardnessTest?.result_detail_json ? JSON.parse(hardnessTest.result_detail_json) : null;

      const candidates = await getCandidatesForAnalysis(analysisId);
      if (candidates.length > 0) {
        await refineIdentification(
          candidates.map((c) => ({ name: c.name, category: c.category ?? undefined, confidence: c.confidence })),
          {
            densityGCm3: density,
            hardnessMin: hardnessDetail?.min ?? null,
            hardnessMax: hardnessDetail?.max ?? null,
            magnetism: magnetism === 'unknown' ? null : mapThreeStateRaw('magnetism', magnetism),
            acidReaction: acid === 'unknown' ? null : mapThreeStateRaw('acid', acid),
            uvFluorescence: uv === 'unknown' ? null : mapThreeStateRaw('uv', uv),
          }
        ).catch(() => null); // offline-tolerant: measurements are saved locally even if the refine call fails
      }

      navigation.navigate('SampleDetail', { sampleId });
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
      <Text style={typography.h1}>{t('measurements.title')}</Text>

      <Field label={t('measurements.weight_g')} value={weightG} onChangeText={setWeightG} />
      <Field label={t('measurements.length_mm')} value={lengthMm} onChangeText={setLengthMm} />
      <Field label={t('measurements.width_mm')} value={widthMm} onChangeText={setWidthMm} />
      <Field label={t('measurements.height_mm')} value={heightMm} onChangeText={setHeightMm} />
      <Field label={t('measurements.volume_cm3')} value={volumeCm3} onChangeText={setVolumeCm3} />

      {density != null && (
        <Text style={styles.densityResult}>
          {t('measurements.density')}: {density} g/cm³ ({t('measurements.density_source')})
        </Text>
      )}

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('HardnessTest', { sampleId })}
      >
        <Text style={styles.linkButtonText}>{t('measurements.hardness_title')} →</Text>
      </TouchableOpacity>

      <ThreeStateGroup title={t('measurements.magnetism')} value={magnetism} onChange={setMagnetism}
        labels={{ none: t('measurements.magnetism_none'), weak: t('measurements.magnetism_weak'), strong: t('measurements.magnetism_strong') }} />

      <ThreeStateGroup title={t('measurements.acid')} value={acid} onChange={setAcid}
        labels={{ none: t('measurements.acid_none'), weak: t('measurements.acid_weak'), strong: t('measurements.acid_strong') }} />
      {acid !== 'unknown' && <Text style={styles.warning}>{t('measurements.acid_warning')}</Text>}

      <ThreeStateGroup title={t('measurements.uv')} value={uv} onChange={setUv}
        labels={{ none: t('measurements.uv_none'), weak: t('measurements.uv_weak'), strong: t('measurements.uv_strong') }} />

      <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
        <Text style={styles.saveButtonText}>{t('measurements.save')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={value} onChangeText={onChangeText} />
    </View>
  );
}

function ThreeStateGroup({
  title,
  value,
  onChange,
  labels,
}: {
  title: string;
  value: ThreeState;
  onChange: (v: ThreeState) => void;
  labels: { none: string; weak: string; strong: string };
}) {
  const options: { key: ThreeState; label: string }[] = [
    { key: 'none', label: labels.none },
    { key: 'weak', label: labels.weak },
    { key: 'strong', label: labels.strong },
  ];
  return (
    <View style={styles.groupContainer}>
      <Text style={styles.fieldLabel}>{title}</Text>
      <View style={styles.optionsRow}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.key}
            style={[styles.option, value === o.key && styles.optionSelected]}
            onPress={() => onChange(o.key)}
          >
            <Text style={[styles.optionText, value === o.key && styles.optionTextSelected]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function mapThreeStateLabel(type: 'magnetism' | 'acid' | 'uv', state: ThreeState): string {
  const map: Record<string, Record<ThreeState, string>> = {
    magnetism: { unknown: 'Unknown', none: 'Non-magnetic', weak: 'Weakly magnetic', strong: 'Magnetic' },
    acid: { unknown: 'Unknown', none: 'No reaction', weak: 'Weak reaction', strong: 'Strong reaction' },
    uv: { unknown: 'Unknown', none: 'No fluorescence', weak: 'Weak fluorescence', strong: 'Strong fluorescence' },
  };
  return map[type][state];
}

function mapThreeStateRaw(type: 'magnetism' | 'acid' | 'uv', state: ThreeState): string {
  if (type === 'magnetism') return state === 'none' ? 'non-magnetic' : state === 'weak' ? 'weakly-magnetic' : 'magnetic';
  if (type === 'acid') return state === 'none' ? 'none' : state === 'weak' ? 'weak' : 'strong';
  return state === 'none' ? 'none' : state === 'weak' ? 'weak' : 'strong';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  fieldRow: { marginBottom: spacing.sm },
  fieldLabel: { ...typography.label, marginBottom: spacing.xs },
  input: { backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  densityResult: { ...typography.h3, color: colors.aqua, marginVertical: spacing.sm },
  linkButton: { paddingVertical: spacing.sm, marginBottom: spacing.md },
  linkButtonText: { color: colors.blue, fontWeight: '700' },
  groupContainer: { marginBottom: spacing.md },
  optionsRow: { flexDirection: 'row', gap: spacing.sm },
  option: { flex: 1, padding: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  optionSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  optionText: { ...typography.caption },
  optionTextSelected: { color: colors.white, fontWeight: '700' },
  warning: { ...typography.caption, color: colors.warning, marginBottom: spacing.md },
  saveButton: { backgroundColor: colors.navy, padding: spacing.md, borderRadius: 8, alignItems: 'center', marginTop: spacing.lg },
  saveButtonText: { color: colors.white, fontWeight: '700' },
});
