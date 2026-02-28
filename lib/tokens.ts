// AEGIS Design Tokens — single source of truth for all visual values.
// No agent ever hardcodes a hex value. Import from here.

export const colors = {
  purple: '#6000FF',
  orange: '#FF5722',
  darkGrey: '#212131',
  black: '#345066',
  appBg: '#0D0D0D',
  white: '#FFFEFF',
  midGrey: '#AAAAAA',
  lightGrey: '#E0E0E0',
  successGreen: '#22C55E',
  errorRed: '#EF4444',
  warningAmber: '#F59E0B',
} as const;

export const fonts = {
  heading: 'Orbitron',
  body: 'Roboto',
} as const;

export const fontSizes = {
  label: 12,
  body: 14,
  subtitle: 16,
  screenTitle: 20,
  hero: 24,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  pill: 999,
  card: 12,
  input: 8,
  badge: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#6000FF',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 4,
  },
  button: {
    shadowColor: '#6000FF',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
