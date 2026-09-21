import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme/colors';

interface EvidenceBarProps {
  label: string;
  value: number | null; // 0..1 or null for missing
}

export default function EvidenceBar({ label, value }: EvidenceBarProps) {
  const isMissing = value === null || value === undefined;
  const widthPercent = isMissing ? 0 : Math.round(value * 100);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        {!isMissing && <View style={[styles.fill, { width: `${widthPercent}%` }]} />}
      </View>
      <Text style={styles.value}>{isMissing ? '—' : `${widthPercent}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  label: { ...typography.caption, width: 130 },
  track: { flex: 1, height: 8, backgroundColor: colors.greyLight, borderRadius: 4, overflow: 'hidden', marginHorizontal: spacing.sm },
  fill: { height: '100%', backgroundColor: colors.aqua },
  value: { ...typography.caption, width: 40, textAlign: 'right' },
});
