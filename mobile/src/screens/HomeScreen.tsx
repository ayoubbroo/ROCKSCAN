import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing } from '../theme/colors';
import { t } from '../i18n';
import { listSamples } from '../db/repositories/samplesRepo';
import { Sample } from '../types/models';

export default function HomeScreen({ navigation }: any) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [query, setQuery] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);

  const load = useCallback(async (q?: string) => {
    const rows = await listSamples({ query: q || undefined });
    setSamples(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(query);
    }, [load, query])
  );

  const toggleCompare = (id: number) => {
    setSelectedForCompare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.title')}</Text>

      <TextInput
        style={styles.search}
        placeholder={t('home.search_placeholder')}
        placeholderTextColor={colors.grey}
        value={query}
        onChangeText={(v) => {
          setQuery(v);
          load(v);
        }}
      />

      <FlatList
        data={samples}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.empty}>{t('home.empty')}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, selectedForCompare.includes(item.id) && styles.cardSelected]}
            onPress={() => navigation.navigate('SampleDetail', { sampleId: item.id })}
            onLongPress={() => toggleCompare(item.id)}
          >
            <Text style={styles.code}>{item.sample_code}</Text>
            <Text style={styles.name}>{item.probable_name || t('common.not_available')}</Text>
            <Text style={styles.classification}>{item.classification || '—'}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {selectedForCompare.length >= 2 && (
        <TouchableOpacity
          style={styles.compareFab}
          onPress={() => navigation.navigate('Compare', { sampleIds: selectedForCompare })}
        >
          <Text style={styles.fabText}>{t('home.compare')} ({selectedForCompare.length})</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Capture', { newSample: true })}>
        <Text style={styles.fabText}>+ {t('home.new_sample')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite, padding: spacing.md },
  title: { ...typography.h1, marginBottom: spacing.md },
  search: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl, color: colors.textSecondary },
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: { borderColor: colors.aqua, borderWidth: 2 },
  code: { ...typography.label, color: colors.aqua },
  name: { ...typography.h3 },
  classification: { ...typography.caption },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 30,
  },
  compareFab: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.aqua,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 30,
  },
  fabText: { color: colors.white, fontWeight: '700' },
});
