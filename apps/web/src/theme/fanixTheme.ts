const sharedTokens = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, huge: 32 },
  radius: { sm: 6, md: 8, lg: 12, xl: 16 },
  shadows: {
    sm: { shadowColor: '#0B2345', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 7, elevation: 2 },
    md: { shadowColor: '#0B2345', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  },
  typography: { display: 36, h1: 30, h2: 24, h3: 20, body: 15, small: 12, label: 11 },
};

export const lightTheme = {
  ...sharedTokens,
  colors: {
    primary: '#0E5CCB', primaryHover: '#0B4FAF', primaryDark: '#0B2345', primaryLight: '#E6F0FF',
    background: '#F2F6FC', surface: '#FFFFFF', surfaceElevated: '#FFFFFF', surfaceSecondary: '#EDF3FA',
    border: '#D5E0EF', divider: '#E3EAF3', textPrimary: '#142A43', textSecondary: '#586D85',
    textMuted: '#5D718B', textInverse: '#FFFFFF', accent: '#0E5CCB', accentHover: '#0B4FAF', accentBright: '#176FDD', accentSoft: '#E7F0FE',
    success: '#167A52', successSoft: '#E5F5ED', successBorder: '#B9E3CE',
    warning: '#8C5700', warningSoft: '#FFF3D9', warningBorder: '#F0D59C',
    danger: '#B83232', dangerSoft: '#FDECEC', dangerBorder: '#F2C3C3',
    info: '#1856B3', infoSoft: '#E8F0FF', infoBorder: '#C5D7FA',
    sidebarBackground: '#0B2345', sidebarSurface: '#12315A', sidebarText: '#FFFFFF',
    sidebarTextMuted: '#BED0E7', sidebarActive: '#17365F', sidebarBorder: '#1D385D',
    inputBackground: '#FFFFFF', inputBorder: '#C9D7E8', inputPlaceholder: '#5F738D',
    disabledSurface: '#E9EEF5', disabledText: '#536780', loginGradient: ['#F4F5F6', '#E9EDF1', '#DDE5EC'] as [string, string, string],
    dark: '#0A172B', darkSurface: '#111F34', darkSurfaceSecondary: '#162B46', white: '#FFFFFF',
  },
};

export const darkTheme: typeof lightTheme = {
  ...sharedTokens,
  colors: {
    primary: '#0E5CCB', primaryHover: '#0B4FAF', primaryDark: '#0B2345', primaryLight: '#D9EAFF',
    background: '#080F1C', surface: '#101B2B', surfaceElevated: '#152238', surfaceSecondary: '#1A2A41',
    border: '#2A3C55', divider: '#24364E', textPrimary: '#F2F6FB', textSecondary: '#B1BFD1',
    textMuted: '#90A3BA', textInverse: '#FFFFFF', accent: '#4C91F2', accentHover: '#75ACFF', accentBright: '#8ABEFF', accentSoft: '#183553',
    success: '#65D6A4', successSoft: '#173A35', successBorder: '#285E50',
    warning: '#F2C36B', warningSoft: '#3B3020', warningBorder: '#69532C',
    danger: '#F08080', dangerSoft: '#3A242B', dangerBorder: '#684047',
    info: '#83B4FF', infoSoft: '#1B3150', infoBorder: '#34577F',
    sidebarBackground: '#09172A', sidebarSurface: '#11243C', sidebarText: '#F2F6FB',
    sidebarTextMuted: '#AABBD0', sidebarActive: '#15365E', sidebarBorder: '#203651',
    inputBackground: '#101B2C', inputBorder: '#3A4E66', inputPlaceholder: '#90A3BA',
    disabledSurface: '#202D3F', disabledText: '#91A2B8', loginGradient: ['#0A1119', '#101821', '#17212C'] as [string, string, string],
    dark: '#0A172B', darkSurface: '#111F34', darkSurfaceSecondary: '#162B46', white: '#FFFFFF',
  },
};

export type FanixTheme = typeof lightTheme;
export const fanixTheme = lightTheme;

export default fanixTheme;
