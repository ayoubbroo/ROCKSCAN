import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors, typography, spacing } from '../theme/colors';
import { t } from '../i18n';
import { MOHS_REFERENCE_POINTS, estimateMohsInterval, ScratchOutcome } from '../services/scoringEngine';
import { addTestResult } from '../db/repositories/testsRepo';

const TESTABLE_REFERENCES = [
  'Fingernail',
  'Copper coin',
  'Glass',
  'Steel knife',
  'Porcelain streak plate',
  'Quartz',
];

export default function HardnessTestScreen({ route, navigation }: any) {
  const { sampleId } = route.params;
  const [results, setResults] = useState<Record<string, ScratchOutcome>>({});

  const setOutcome = (name: string, outcome: ScratchOutcome) => {
    setResults((prev) => ({ ...prev, [name]: outcome }));
  };

  const entries = Object.entries(results).map(([referenceName, outcome]) => ({ referenceName, outcome }));
  const interval = entries.length > 0 ? estimateMohsInterval(entries) : null;

  const save = async () => {
    if (!interval || interval.contradictory) {
      Alert.alert(t('common.error'), 'Contradictory scratch results — please re-test.');
      return;
    }
    await addTestResult(sampleId, 'hardness', `${interval.min}-${interval.max}`, {
      min: interval.min,
      max: interval.max,
      scratchTests: results,
    });
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
      <Text style={typography.h1}>{t('measurements.hardness_title')}</Text>
      <Text style={styles.instruction}>{t('measurements.hardness_instruction')}</Text>

      {TESTABLE_REFERENCES.map((name) => {
        const ref = MOHS_REFERENCE_POINTS.find((r) => r.name === name)!;
        const current = results[name];
        return (
          <View key={name} style={styles.row}>
            <Text style={styles.refName}>
              {name} (~{ref.hardness})
            </Text>
            <View style={styles.optionsRow}>
              {(['scratches', 'does_not_scratch', 'uncertain'] as ScratchOutcome[]).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.option, current === opt && styles.optionSelected]}
                  onPress={() => setOutcome(name, opt)}
                >
                  <Text style={[styles.optionText, current === opt && styles.optionTextSelected]}>
                    {opt === 'scratches'
                      ? t('measurements.scratches')
                      : opt === 'does_not_scratch'
                      ? t('measurements.does_not_scratch')
                      : t('measurements.uncertain')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      {interval && !interval.contradictory && (
        <Text style={styles.result}>
          {t('measurements.hardness_result')}: {interval.min} – {interval.max}
        </Text>
      )}
      {interval?.contradictory && (
        <Text style={[styles.result, { color: colors.danger }]}>Contradictory results — please re-test.</Text>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={save}>
        <Text style={styles.saveButtonText}>{t('common.save')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  instruction: { ...typography.body, marginBottom: spacing.md, color: colors.textSecondary },
  row: { marginBottom: spacing.md },
  refName: { ...typography.h3, marginBottom: spacing.xs },
  optionsRow: { flexDirection: 'row', gap: spacing.sm },
  option: { flex: 1, padding: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  optionSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  optionText: { ...typography.caption, textAlign: 'center' },
  optionTextSelected: { color: colors.white, fontWeight: '700' },
  result: { ...typography.h2, color: colors.aqua, marginVertical: spacing.lg, textAlign: 'center' },
  saveButton: { backgroundColor: colors.navy, padding: spacing.md, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: colors.white, fontWeight: '700' },
});
