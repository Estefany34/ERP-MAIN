const sharedTokens = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, huge: 32 },
  radius: { sm: 6, md: 8, lg: 12, xl: 16 },
  shadows: {
    sm: { shadowColor: '#0B2345', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 7, elevation: 2 },
    md: { shadowColor: '#0B2345', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  },
  typography: { display: 36, h1: 30, h2: 24, h3: 20, body: 15, small: 12, label: 11 },
};
type ColorStops = [string, string, ...string[]];

export const lightTheme = {
  ...sharedTokens,
  colors: {
    primary: '#0E5CCB', primaryHover: '#0B4FAF', primaryDark: '#0B2345', primaryLight: '#E6F0FF',
    background: '#F2F6FC', surface: '#FFFFFF', surfaceElevated: '#FFFFFF', surfaceSecondary: '#EDF3FA', emptySurface: '#F7F9FC',
    border: '#D5E0EF', divider: '#E3EAF3', textPrimary: '#142A43', textSecondary: '#586D85',
    textMuted: '#5D718B', textInverse: '#FFFFFF', accent: '#0E5CCB', accentHover: '#0B4FAF', accentBright: '#176FDD', accentSoft: '#E7F0FE',
    success: '#167A52', successSoft: '#E5F5ED', successBorder: '#B9E3CE',
    warning: '#8C5700', warningSoft: '#FFF3D9', warningBorder: '#F0D59C',
    danger: '#B83232', dangerSoft: '#FDECEC', dangerBorder: '#F2C3C3',
    info: '#1856B3', infoSoft: '#E8F0FF', infoBorder: '#C5D7FA',
    sidebarBackground: '#0B2345', sidebarSurface: '#12315A', sidebarText: '#FFFFFF',
    sidebarTextMuted: '#BED0E7', sidebarActive: '#17365F', sidebarBorder: '#1D385D',
    inputBackground: '#FFFFFF', inputBorder: '#C9D7E8', inputPlaceholder: '#5F738D',
    disabledSurface: '#E9EEF5', disabledText: '#536780', loginGradient: ['#F4F5F6', '#E9EDF1', '#DDE5EC'] as ColorStops, loginAmbientSecondary: ['transparent', 'transparent', 'transparent'] as ColorStops, contentAmbient: ['transparent', 'transparent', 'transparent', 'transparent'] as ColorStops, contentAmbientSecondary: ['transparent', 'transparent', 'transparent'] as ColorStops,
    dark: '#0A172B', darkSurface: '#111F34', darkSurfaceSecondary: '#162B46', white: '#FFFFFF',
  },
};

export const darkTheme: typeof lightTheme = {
  ...sharedTokens,
  colors: {
    primary: '#0E5CCB', primaryHover: '#0B4FAF', primaryDark: '#0B2345', primaryLight: '#D9EAFF',
    background: '#070D17', surface: '#0E1827', surfaceElevated: '#16243A', surfaceSecondary: '#1B2A3F', emptySurface: '#111D2D',
    border: '#2D4058', divider: '#25364B', textPrimary: '#F2F6FB', textSecondary: '#B1BFD1',
    textMuted: '#90A3BA', textInverse: '#FFFFFF', accent: '#4C91F2', accentHover: '#75ACFF', accentBright: '#8ABEFF', accentSoft: '#183553',
    success: '#65D6A4', successSoft: '#173A35', successBorder: '#285E50',
    warning: '#F2C36B', warningSoft: '#3B3020', warningBorder: '#69532C',
    danger: '#F08080', dangerSoft: '#3A242B', dangerBorder: '#684047',
    info: '#83B4FF', infoSoft: '#1B3150', infoBorder: '#34577F',
    sidebarBackground: '#091522', sidebarSurface: '#10233A', sidebarText: '#F2F6FB',
    sidebarTextMuted: '#AABBD0', sidebarActive: '#122D4B', sidebarBorder: '#20344E',
    inputBackground: '#0B1421', inputBorder: '#364A61', inputPlaceholder: '#90A3BA',
    disabledSurface: '#202D3F', disabledText: '#91A2B8', loginGradient: ['rgba(14,92,203,0.30)', 'rgba(14,92,203,0.16)', 'rgba(14,92,203,0.04)', 'transparent'] as ColorStops, loginAmbientSecondary: ['rgba(14,92,203,0.12)', 'rgba(14,92,203,0.03)', 'transparent'] as ColorStops, contentAmbient: ['rgba(14,92,203,0.24)', 'rgba(14,92,203,0.12)', 'rgba(14,92,203,0.03)', 'transparent'] as ColorStops, contentAmbientSecondary: ['rgba(14,92,203,0.10)', 'rgba(14,92,203,0.02)', 'transparent'] as ColorStops,
    dark: '#0A172B', darkSurface: '#111F34', darkSurfaceSecondary: '#162B46', white: '#FFFFFF',
  },
  shadows: {
    sm: { shadowColor: '#02060D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 9, elevation: 2 },
    md: { shadowColor: '#02060D', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 18, elevation: 4 },
  },
};

export type FanixTheme = typeof lightTheme;
export const fanixTheme = lightTheme;

export default fanixTheme;
