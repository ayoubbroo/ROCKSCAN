import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors, typography, spacing } from '../theme/colors';
import { t } from '../i18n';
import { useSettings } from '../context/SettingsContext';
import { getValuation } from '../services/api';
import { addValuation, addManualMarketSource } from '../db/repositories/valuationsRepo';
import { getSampleById } from '../db/repositories/samplesRepo';

export default function ValuationScreen({ route, navigation }: any) {
  const { sampleId } = route.params;
  const { currency } = useSettings();
  const [materialType, setMaterialType] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [quality, setQuality] = useState('');
  const [rarity, setRarity] = useState('');
  const [result, setResult] = useState<any>(null);
  const [manualSourceName, setManualSourceName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const runValuation = async () => {
    if (!materialType || !weightGrams || !quality) {
      Alert.alert(t('common.error'), 'materialType, weightGrams and quality are required.');
      return;
    }
    setLoading(true);
    try {
      const sample = await getSampleById(sampleId);
      const response: any = await getValuation({
        materialType: materialType || sample?.probable_name || 'Unknown',
        weightGrams: parseFloat(weightGrams),
        quality,
        rarity,
        currency,
      });
      setResult(response);

      const valuation = await addValuation(sampleId, {
        currency,
        lowEstimate: response.indicativeRange?.low ?? null,
        highEstimate: response.indicativeRange?.high ?? null,
        basis: { materialType, weightGrams, quality, rarity },
      });

      if (manualSourceName && manualPrice) {
        await addManualMarketSource(valuation.id, {
          source_name: manualSourceName,
          source_date: new Date().toISOString().slice(0, 10),
          price: parseFloat(manualPrice),
          currency,
          unit: 'per_piece',
          condition: quality,
          market_type: 'manual',
        });
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
      <Text style={typography.h1}>{t('valuation.title')}</Text>
      <Text style={styles.disclaimer}>{t('valuation.disclaimer')}</Text>

      <Field label="Material type" value={materialType} onChangeText={setMaterialType} />
      <Field label="Weight (g)" value={weightGrams} onChangeText={setWeightGrams} keyboardType="numeric" />
      <Field label="Quality" value={quality} onChangeText={setQuality} />
      <Field label="Rarity" value={rarity} onChangeText={setRarity} />

      <TouchableOpacity style={styles.button} onPress={runValuation} disabled={loading}>
        <Text style={styles.buttonText}>{t('valuation.title')}</Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.resultBox}>
          {result.indicativeRange?.available ? (
            <Text style={styles.rangeText}>
              {result.indicativeRange.low} – {result.indicativeRange.high} {currency}
            </Text>
          ) : (
            <Text style={styles.unavailable}>{t('valuation.unavailable')}</Text>
          )}
          <Text style={styles.disclaimerSmall}>{result.disclaimer}</Text>
        </View>
      )}

      <Text style={[typography.h3, { marginTop: spacing.lg }]}>{t('valuation.add_manual_entry')}</Text>
      <Field label={t('valuation.source_name')} value={manualSourceName} onChangeText={setManualSourceName} />
      <Field label={t('valuation.price')} value={manualPrice} onChangeText={setManualPrice} keyboardType="numeric" />
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, keyboardType }: any) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType={keyboardType || 'default'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  disclaimer: { ...typography.caption, fontStyle: 'italic', marginBottom: spacing.md },
  fieldRow: { marginBottom: spacing.sm },
  fieldLabel: { ...typography.label, marginBottom: spacing.xs },
  input: { backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  button: { backgroundColor: colors.navy, padding: spacing.md, borderRadius: 8, alignItems: 'center', marginTop: spacing.md },
  buttonText: { color: colors.white, fontWeight: '700' },
  resultBox: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  rangeText: { ...typography.h2, color: colors.aqua },
  unavailable: { ...typography.h3, color: colors.grey },
  disclaimerSmall: { ...typography.caption, marginTop: spacing.xs, fontStyle: 'italic' },
});
