import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme/colors';
import { t } from '../i18n';
import { ConfidenceLabel } from '../types/models';

const LABEL_KEY: Record<ConfidenceLabel, string> = {
  HIGH_CONFIDENCE: 'analysis.confidence_high',
  MEDIUM_CONFIDENCE: 'analysis.confidence_medium',
  LOW_CONFIDENCE: 'analysis.confidence_low',
  INSUFFICIENT_DATA: 'analysis.confidence_insufficient',
};

const LABEL_COLOR: Record<ConfidenceLabel, string> = {
  HIGH_CONFIDENCE: colors.confidenceHigh,
  MEDIUM_CONFIDENCE: colors.confidenceMedium,
  LOW_CONFIDENCE: colors.confidenceLow,
  INSUFFICIENT_DATA: colors.confidenceInsufficient,
};

export default function ConfidenceBadge({ label, percent }: { label: ConfidenceLabel; percent?: number }) {
  const bg = LABEL_COLOR[label] || colors.confidenceInsufficient;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.text}>
        {t(LABEL_KEY[label] || 'analysis.confidence_insufficient')}
        {percent != null ? ` · ${Math.round(percent)}%` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  text: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
