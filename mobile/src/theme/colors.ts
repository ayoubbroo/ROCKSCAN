// Professional scientific palette: dark navy, deep blue, white, aqua.
// Used across all screens instead of ad-hoc hex values.
export const colors = {
  navy: '#0B1E33',
  deepBlue: '#123A5E',
  blue: '#1C5D99',
  aqua: '#3FB8AF',
  aquaLight: '#CFF3F0',
  white: '#FFFFFF',
  offWhite: '#F4F7F9',
  grey: '#6B7A8F',
  greyLight: '#D8E0E7',
  textPrimary: '#0B1E33',
  textSecondary: '#4B5C6B',
  success: '#2E9E5B',
  warning: '#C97F1B',
  danger: '#C0392B',
  confidenceHigh: '#2E9E5B',
  confidenceMedium: '#C97F1B',
  confidenceLow: '#C0392B',
  confidenceInsufficient: '#6B7A8F',
  card: '#FFFFFF',
  border: '#E1E8ED',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const typography = {
  h1: { fontSize: 26, fontWeight: '700' as const, color: colors.textPrimary },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.textPrimary },
  h3: { fontSize: 16, fontWeight: '600' as const, color: colors.textPrimary },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.textPrimary },
  caption: { fontSize: 12, fontWeight: '400' as const, color: colors.textSecondary },
  label: { fontSize: 12, fontWeight: '600' as const, color: colors.grey, letterSpacing: 0.5 },
};
