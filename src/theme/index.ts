export const colors = {
  primary: '#0DB09E',
  primaryDark: '#0A8C7D',
  secondary: '#22C55E',
  accent: '#5B7CFA',
  warning: '#F59E0B',
  danger: '#EF4444',
  ink: '#1F2937',
  muted: '#6B7280',
  mutedLight: '#9CA3AF',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  primarySoft: '#E0F7F4',
  emergencySoft: '#FEF2F2',
  emergencyBorder: '#FCA5A5',
  warningSoft: '#FEF9C3',
  warningText: '#854D0E',
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const typography = {
  // Su React Native usiamo le font di sistema; in fase 2 carichiamo Poppins/Inter via expo-font.
  titleFamily: undefined,
  bodyFamily: undefined,
};

export type ThemeColor = keyof typeof colors;
