import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors, typography, spacing } from '../theme/colors';
import { t } from '../i18n';
import { SUPPORTED_LOCALES, SupportedLocale } from '../i18n';
import { useSettings, Currency } from '../context/SettingsContext';
import { checkBackendHealth } from '../services/api';
import { backupDatabase, restoreDatabase } from '../services/backupService';
import { exportAndShareArchive } from '../services/excelExport';

const CURRENCIES: Currency[] = ['MAD', 'USD', 'EUR'];

export default function SettingsScreen() {
  const { locale, currency, changeLocale, changeCurrency } = useSettings();
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'unreachable' | 'not_configured'>('checking');

  useEffect(() => {
    (async () => {
      try {
        const health = await checkBackendHealth();
        setApiStatus(health.aiProviderConfigured ? 'ok' : 'not_configured');
      } catch {
        setApiStatus('unreachable');
      }
    })();
  }, []);

  const onLanguageChange = async (next: SupportedLocale) => {
    await changeLocale(next);
    if (next === 'ar' || locale === 'ar') {
      Alert.alert('Restart required', 'Please restart the app for the layout direction change to fully apply.');
    }
  };

  const onBackup = async () => {
    try {
      await backupDatabase();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const onRestore = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    Alert.alert(
      t('settings.restore'),
      'This will overwrite your current archive. Continue?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await restoreDatabase(picked.assets[0].uri);
              Alert.alert('Done', 'Archive restored. Please restart the app.');
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
      <Text style={typography.h1}>{t('settings.title')}</Text>

      <Section title={t('settings.language')}>
        <View style={styles.optionsRow}>
          {SUPPORTED_LOCALES.map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.option, locale === l && styles.optionSelected]}
              onPress={() => onLanguageChange(l)}
            >
              <Text style={[styles.optionText, locale === l && styles.optionTextSelected]}>{l.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      <Section title={t('settings.currency')}>
        <View style={styles.optionsRow}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.option, currency === c && styles.optionSelected]}
              onPress={() => changeCurrency(c)}
            >
              <Text style={[styles.optionText, currency === c && styles.optionTextSelected]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      <Section title={t('settings.api_status')}>
        <Text style={styles.statusText}>
          {apiStatus === 'checking' && t('common.loading')}
          {apiStatus === 'ok' && '✅ Backend reachable, AI provider configured'}
          {apiStatus === 'not_configured' && '⚠️ Backend reachable, but ANTHROPIC_API_KEY is not set'}
          {apiStatus === 'unreachable' && '❌ Backend unreachable — check API_BASE_URL and that the server is running'}
        </Text>
      </Section>

      <Section title={t('settings.export')}>
        <TouchableOpacity style={styles.button} onPress={exportAndShareArchive}>
          <Text style={styles.buttonText}>ROCK_ARCHIVE.xlsx</Text>
        </TouchableOpacity>
      </Section>

      <Section title={t('settings.backup')}>
        <TouchableOpacity style={styles.button} onPress={onBackup}>
          <Text style={styles.buttonText}>{t('settings.backup')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onRestore}>
          <Text style={styles.secondaryButtonText}>{t('settings.restore')}</Text>
        </TouchableOpacity>
      </Section>

      <Section title={t('settings.about')}>
        <Text style={typography.caption}>ROCK ARCHIVE PRO v1.0.0 — EL-BROTHERS-SERVICE</Text>
        <Text style={typography.caption}>{t('settings.privacy')} · {t('settings.terms')}</Text>
      </Section>
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
  section: { backgroundColor: colors.white, borderRadius: 8, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border },
  optionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  option: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  optionSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  optionText: { ...typography.body },
  optionTextSelected: { color: colors.white, fontWeight: '700' },
  statusText: { ...typography.body, marginTop: spacing.sm },
  button: { backgroundColor: colors.navy, padding: spacing.md, borderRadius: 8, alignItems: 'center', marginTop: spacing.sm },
  buttonText: { color: colors.white, fontWeight: '700' },
  secondaryButton: { padding: spacing.md, borderRadius: 8, alignItems: 'center', marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.textPrimary, fontWeight: '600' },
});
