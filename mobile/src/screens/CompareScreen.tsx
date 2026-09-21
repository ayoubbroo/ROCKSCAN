import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme/colors';
import { t } from '../i18n';
import { getSampleById } from '../db/repositories/samplesRepo';
import { getLatestMeasurement } from '../db/repositories/measurementsRepo';
import { getTestsForSample } from '../db/repositories/testsRepo';
import { getValuationsForSample } from '../db/repositories/valuationsRepo';
import { getLocationForSample } from '../db/repositories/locationsRepo';

interface ComparisonRow {
  sample: any;
  measurement: any;
  hardness: any;
  valuation: any;
  location: any;
}

export default function CompareScreen({ route }: any) {
  const { sampleIds }: { sampleIds: number[] } = route.params;
  const [rows, setRows] = useState<ComparisonRow[]>([]);

  useEffect(() => {
    (async () => {
      const loaded = await Promise.all(
        sampleIds.map(async (id) => ({
          sample: await getSampleById(id),
          measurement: await getLatestMeasurement(id),
          hardness: (await getTestsForSample(id)).find((tst) => tst.test_type === 'hardness'),
          valuation: (await getValuationsForSample(id))[0],
          location: await getLocationForSample(id),
        }))
      );
      setRows(loaded);
    })();
  }, [sampleIds]);

  const fields: { label: string; get: (r: ComparisonRow) => string }[] = [
    { label: t('sample.id'), get: (r) => r.sample?.sample_code },
    { label: t('analysis.classification'), get: (r) => r.sample?.classification || '—' },
    { label: 'Name', get: (r) => r.sample?.probable_name || '—' },
    { label: t('measurements.density'), get: (r) => (r.measurement?.density_g_cm3 ? `${r.measurement.density_g_cm3} g/cm³` : '—') },
    { label: t('measurements.hardness_title'), get: (r) => r.hardness?.result_value || '—' },
    { label: t('valuation.title'), get: (r) => (r.valuation ? `${r.valuation.low_estimate}-${r.valuation.high_estimate} ${r.valuation.currency}` : t('valuation.unavailable')) },
    { label: t('sample.location'), get: (r) => [r.location?.city, r.location?.country].filter(Boolean).join(', ') || '—' },
  ];

  return (
    <ScrollView style={styles.container} horizontal>
      <View>
        <View style={styles.headerRow}>
          <View style={styles.labelCell} />
          {rows.map((r) => (
            <View key={r.sample?.id} style={styles.cell}>
              <Text style={styles.headerText}>{r.sample?.sample_code}</Text>
            </View>
          ))}
        </View>
        {fields.map((f) => {
          const values = rows.map((r) => f.get(r));
          const allSame = values.every((v) => v === values[0]);
          return (
            <View key={f.label} style={styles.row}>
              <View style={styles.labelCell}>
                <Text style={styles.labelText}>{f.label}</Text>
              </View>
              {values.map((v, i) => (
                <View key={i} style={[styles.cell, !allSame && styles.diffCell]}>
                  <Text style={styles.cellText}>{v}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, padding: spacing.md },
  headerRow: { flexDirection: 'row', marginBottom: spacing.sm },
  row: { flexDirection: 'row', marginBottom: spacing.xs },
  labelCell: { width: 140, padding: spacing.sm, justifyContent: 'center' },
  labelText: { ...typography.label },
  cell: { width: 150, padding: spacing.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  diffCell: { backgroundColor: colors.aquaLight },
  cellText: { ...typography.body },
  headerText: { ...typography.h3, textAlign: 'center' },
});
