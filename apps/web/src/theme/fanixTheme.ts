const sharedTokens = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, huge: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  shadows: {
    sm: { shadowColor: '#0B2345', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
    md: { shadowColor: '#0B2345', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 },
  },
  typography: { display: 36, h1: 30, h2: 24, h3: 20, body: 15, small: 12, label: 11 },
};

export const lightTheme = {
  ...sharedTokens,
  colors: {
    primary: '#0E5CCB', primaryDark: '#0B2345', primaryLight: '#D9EAFF',
    background: '#F3F6FB', surface: '#FFFFFF', surfaceElevated: '#FFFFFF', surfaceSecondary: '#EEF4FF',
    border: '#D5E0F0', divider: '#D5E0F0', textPrimary: '#122338', textSecondary: '#586C83',
    textMuted: '#7B8AA1', textInverse: '#FFFFFF', accent: '#0E5CCB', accentHover: '#0B4FAF', accentSoft: '#D9EAFF',
    success: '#167A52', successSoft: '#E5F5ED', successBorder: '#B9E3CE',
    warning: '#8C5700', warningSoft: '#FFF3D9', warningBorder: '#F0D59C',
    danger: '#B83232', dangerSoft: '#FDECEC', dangerBorder: '#F2C3C3',
    info: '#1856B3', infoSoft: '#E8F0FF', infoBorder: '#C5D7FA',
    sidebarBackground: '#0B2345', sidebarSurface: '#12315A', sidebarText: '#FFFFFF',
    sidebarTextMuted: '#B7CBE8', sidebarActive: '#16315E', sidebarBorder: '#1A2F52', logoSurface: '#FFFFFF',
    inputBackground: '#FFFFFF', inputBorder: '#D5E0F0', inputPlaceholder: '#5F738D',
    disabledSurface: '#E9EEF5', disabledText: '#5F738D', loginBackdrop: '#EAF2FF',
    dark: '#0A172B', darkSurface: '#111F34', darkSurfaceSecondary: '#162B46', white: '#FFFFFF',
  },
};

export const darkTheme: typeof lightTheme = {
  ...sharedTokens,
  colors: {
    primary: '#0E5CCB', primaryDark: '#0B2345', primaryLight: '#D9EAFF',
    background: '#08111F', surface: '#111C2E', surfaceElevated: '#152238', surfaceSecondary: '#17263C',
    border: '#263850', divider: '#263850', textPrimary: '#F4F7FB', textSecondary: '#AAB8CA',
    textMuted: '#91A2B8', textInverse: '#FFFFFF', accent: '#4C91F2', accentHover: '#72A8F7', accentSoft: '#18345A',
    success: '#65D6A4', successSoft: '#173A35', successBorder: '#285E50',
    warning: '#F2C36B', warningSoft: '#3B3020', warningBorder: '#69532C',
    danger: '#F08080', dangerSoft: '#3A242B', dangerBorder: '#684047',
    info: '#83B4FF', infoSoft: '#1B3150', infoBorder: '#34577F',
    sidebarBackground: '#09182B', sidebarSurface: '#10233D', sidebarText: '#F4F7FB',
    sidebarTextMuted: '#AABBD0', sidebarActive: '#173A67', sidebarBorder: '#223751', logoSurface: '#FFFFFF',
    inputBackground: '#0D192A', inputBorder: '#344961', inputPlaceholder: '#91A2B8',
    disabledSurface: '#202D3F', disabledText: '#91A2B8', loginBackdrop: '#0B1728',
    dark: '#0A172B', darkSurface: '#111F34', darkSurfaceSecondary: '#162B46', white: '#FFFFFF',
  },
};

export type FanixTheme = typeof lightTheme;
export const fanixTheme = lightTheme;

export default fanixTheme;
