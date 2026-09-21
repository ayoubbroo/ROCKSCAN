import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme/colors';
import ConfidenceBadge from './ConfidenceBadge';
import { t } from '../i18n';

export interface CandidateCardProps {
  rank: number;
  name: string;
  category?: string | null;
  confidence: number; // 0..1
  confidenceLabel: 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE' | 'INSUFFICIENT_DATA';
  supportingEvidence: string[];
  contradictingEvidence: string[];
  referenceNote?: string | null;
}

export default function CandidateCard(props: CandidateCardProps) {
  const { rank, name, category, confidence, confidenceLabel, supportingEvidence, contradictingEvidence, referenceNote } = props;
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.rank}>#{rank}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          {category ? <Text style={styles.category}>{category}</Text> : null}
        </View>
        <ConfidenceBadge label={confidenceLabel} percent={confidence * 100} />
      </View>

      {supportingEvidence.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('analysis.supporting_evidence')}</Text>
          {supportingEvidence.map((e, i) => (
            <Text key={i} style={styles.evidencePositive}>
              + {e}
            </Text>
          ))}
        </View>
      )}

      {contradictingEvidence.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('analysis.contradicting_evidence')}</Text>
          {contradictingEvidence.map((e, i) => (
            <Text key={i} style={styles.evidenceNegative}>
              − {e}
            </Text>
          ))}
        </View>
      )}

      {referenceNote ? <Text style={styles.referenceNote}>{referenceNote}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  rank: { ...typography.h3, color: colors.aqua, width: 32 },
  name: { ...typography.h3 },
  category: { ...typography.caption },
  section: { marginTop: spacing.sm },
  sectionLabel: { ...typography.label, marginBottom: spacing.xs },
  evidencePositive: { ...typography.body, color: colors.success },
  evidenceNegative: { ...typography.body, color: colors.danger },
  referenceNote: { ...typography.caption, marginTop: spacing.sm, fontStyle: 'italic' },
});
