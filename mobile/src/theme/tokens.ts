export const palette = {
  brand: {
    50: '#071B3A',
    100: '#0A2852',
    200: '#0D3A7A',
    300: '#29AFFF',
    400: '#08C8F4',
    500: '#087CFA',
    600: '#087CFA',
    700: '#0758E8',
  },
  ink: {
    50: '#020B24',
    100: '#041638',
    200: '#082454',
    300: '#27466F',
    400: '#AFC3DD',
    500: '#AFC3DD',
    600: '#C5D4E8',
    700: '#E2EAF5',
    900: '#FFFFFF',
    950: '#FFFFFF',
  },
  white: '#ffffff',
  danger: '#FF5D73',
  dangerBg: '#3A1218',
  warning: '#F5A524',
  warningBg: '#3A2A0A',
  success: '#21D4B4',
} as const;

/** Matches web `--primary-gradient`. */
export const primaryGradient = {
  colors: ['#08C8F4', '#087CFA', '#0758E8'] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const tokens = {
  background: '#020B24',
  surface: '#041638',
  surfaceElevated: '#082454',
  primary: '#087CFA',
  primaryHover: '#0758E8',
  accent: '#08C8F4',
  accentLight: '#29AFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#AFC3DD',
  border: '#27466F',
  success: '#21D4B4',
  error: '#FF5D73',
} as const;

export const color = {
  light: {
    text: palette.ink[950],
    textSecondary: palette.ink[400],
    textMuted: palette.ink[400],
    background: palette.ink[50],
    surface: palette.ink[200],
    surfaceAlt: palette.ink[100],
    border: palette.ink[300],
    brand: palette.brand[500],
    brandText: palette.brand[300],
    brandMuted: palette.brand[50],
    danger: palette.danger,
    overlay: 'rgba(2, 11, 36, 0.72)',
  },
  dark: {
    text: palette.white,
    textSecondary: palette.ink[400],
    textMuted: palette.ink[400],
    background: palette.ink[50],
    surface: palette.ink[200],
    surfaceAlt: palette.ink[100],
    border: palette.ink[300],
    brand: palette.brand[400],
    brandText: palette.brand[300],
    brandMuted: palette.brand[50],
    danger: palette.danger,
    overlay: 'rgba(0, 0, 0, 0.55)',
  },
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const type = {
  display: { fontFamily: 'Fraunces_700Bold', fontSize: 32, lineHeight: 38 },
  title: { fontFamily: 'Fraunces_700Bold', fontSize: 24, lineHeight: 30 },
  subtitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18, lineHeight: 24 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18 },
} as const;

export const touch = {
  min: 44,
} as const;

export type ThemeName = keyof typeof color;
export type ThemeColors = (typeof color)[ThemeName];
