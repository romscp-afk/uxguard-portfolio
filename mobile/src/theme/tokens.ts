export const palette = {
  brand: {
    50: '#EBF5FF',
    100: '#D6EBFF',
    200: '#ADD6FF',
    300: '#29AFFF',
    400: '#08C8F4',
    500: '#087CFA',
    600: '#0758E8',
    700: '#0548C4',
  },
  ink: {
    50: '#f4f7fb',
    100: '#e8eef6',
    200: '#d1dbe8',
    400: '#7a92ad',
    500: '#5a7390',
    600: '#475c74',
    700: '#3a4a5f',
    900: '#162440',
    950: '#001334',
  },
  white: '#ffffff',
  danger: '#FF5D73',
  dangerBg: '#fef3f2',
  warning: '#b54708',
  warningBg: '#fffaeb',
  success: '#21D4B4',
} as const;

/** Matches web `--primary-gradient`. */
export const primaryGradient = {
  colors: ['#08C8F4', '#087CFA', '#0758E8'] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const color = {
  light: {
    text: palette.ink[950],
    textSecondary: palette.ink[600],
    textMuted: palette.ink[400],
    background: palette.ink[50],
    surface: palette.white,
    surfaceAlt: palette.ink[50],
    border: palette.ink[200],
    brand: palette.brand[500],
    brandText: palette.brand[700],
    brandMuted: palette.brand[50],
    danger: palette.danger,
    overlay: 'rgba(0, 19, 52, 0.45)',
  },
  dark: {
    text: palette.white,
    textSecondary: palette.ink[200],
    textMuted: palette.ink[400],
    background: palette.ink[950],
    surface: palette.ink[900],
    surfaceAlt: palette.ink[900],
    border: palette.ink[700],
    brand: palette.brand[400],
    brandText: palette.brand[200],
    brandMuted: '#021B4D',
    danger: '#f97066',
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
