import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { colors, typography, spacing } from '../theme/colors';
import { t } from '../i18n';
import { useSettings } from '../context/SettingsContext';
import { getSampleById, deleteSample } from '../db/repositories/samplesRepo';
import { getPhotosForSample } from '../db/repositories/photosRepo';
import { getHistoryForSample } from '../db/repositories/historyRepo';
import { getLatestMeasurement } from '../db/repositories/measurementsRepo';
import { getTestsForSample } from '../db/repositories/testsRepo';
import { getLocationForSample } from '../db/repositories/locationsRepo';
import { buildSampleQrValue } from '../services/qrService';
import { generateAndShareSamplePdf } from '../services/pdfExport';
import { exportSampleToExcel } from '../services/excelExport';
import * as Sharing from 'expo-sharing';

export default function SampleDetailScreen({ route, navigation }: any) {
  const { sampleId } = route.params;
  const { locale } = useSettings();
  const [sample, setSample] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [measurement, setMeasurement] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [location, setLocation] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setSample(await getSampleById(sampleId));
    setPhotos(await getPhotosForSample(sampleId));
    setHistory(await getHistoryForSample(sampleId));
    setMeasurement(await getLatestMeasurement(sampleId));
    setTests(await getTestsForSample(sampleId));
    setLocation(await getLocationForSample(sampleId));
  }, [sampleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onGeneratePdf = async () => {
    setBusy(true);
    try {
      await generateAndShareSamplePdf(sampleId, locale);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setBusy(false);
    }
  };

  const onExportExcel = async () => {
    setBusy(true);
    try {
      const uri = await exportSampleToExcel(sampleId);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = () => {
    Alert.alert(t('sample.delete'), sample?.sample_code, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          await deleteSample(sampleId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!sample) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
      <Text style={styles.code}>{sample.sample_code}</Text>
      <Text style={typography.h1}>{sample.probable_name || t('common.not_available')}</Text>
      <Text style={styles.classification}>{sample.classification}</Text>

      <ScrollView horizontal style={styles.photoRow}>
        {photos.map((p) => (
          <Image key={p.id} source={{ uri: p.uri }} style={styles.photo} />
        ))}
      </ScrollView>

      <View style={styles.qrBox}>
        <QRCode value={buildSampleQrValue(sample.sample_code)} size={120} />
        <Text style={styles.qrCaption}>{t('sample.qr_code')}</Text>
      </View>

      {measurement && (
        <Section title={t('measurements.title')}>
          <Text style={typography.body}>
            {t('measurements.weight_g')}: {measurement.weight_g ?? '—'} · {t('measurements.density')}: {measurement.density_g_cm3 ?? '—'} g/cm³
          </Text>
        </Section>
      )}

      {tests.length > 0 && (
        <Section title="Tests">
          {tests.map((tst) => (
            <Text key={tst.id} style={typography.body}>
              {tst.test_type}: {tst.result_value}
            </Text>
          ))}
        </Section>
      )}

      {location && (
        <Section title={t('sample.location')}>
          <Text style={typography.body}>{[location.city, location.region, location.country].filter(Boolean).join(', ') || t('common.not_available')}</Text>
        </Section>
      )}

      <Section title={t('sample.timeline')}>
        {history.map((h) => (
          <Text key={h.id} style={styles.historyLine}>
            {new Date(h.created_at).toLocaleString()} — {h.event_type}
          </Text>
        ))}
      </Section>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Valuation', { sampleId })}>
        <Text style={styles.buttonText}>{t('valuation.title')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onGeneratePdf} disabled={busy}>
        <Text style={styles.buttonText}>{t('sample.generate_report')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onExportExcel} disabled={busy}>
        <Text style={styles.buttonText}>{t('sample.export_excel')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Text style={styles.deleteButtonText}>{t('sample.delete')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={typography.h3}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  code: { ...typography.label, color: colors.aqua },
  classification: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  photoRow: { marginBottom: spacing.md },
  photo: { width: 100, height: 100, borderRadius: 8, marginRight: spacing.sm },
  qrBox: { alignItems: 'center', backgroundColor: colors.white, padding: spacing.md, borderRadius: 8, marginBottom: spacing.md },
  qrCaption: { ...typography.caption, marginTop: spacing.xs },
  section: { backgroundColor: colors.white, borderRadius: 8, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  historyLine: { ...typography.caption, marginTop: 2 },
  button: { backgroundColor: colors.navy, padding: spacing.md, borderRadius: 8, alignItems: 'center', marginBottom: spacing.sm },
  buttonText: { color: colors.white, fontWeight: '700' },
  deleteButton: { padding: spacing.md, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.danger, marginTop: spacing.md },
  deleteButtonText: { color: colors.danger, fontWeight: '700' },
});
