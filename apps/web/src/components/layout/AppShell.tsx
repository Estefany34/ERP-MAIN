import React from 'react';
import { Dimensions, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFanixTheme, type ThemeMode } from '../../theme/FanixThemeProvider';

export type NavItem = {
  label: string;
  value: string;
  enabled?: boolean;
};

export function AppShell({
  title,
  subtitle,
  navItems,
  activeItem,
  onSelect,
  onLogout,
  children,
}: {
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  activeItem: string;
  onSelect: (value: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const compact = Dimensions.get('window').width < 900;
  const companyName = subtitle?.trim() || 'Empresa';
  const { theme, mode, setMode } = useFanixTheme();

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.shell, compact && styles.shellCompact]}>
        <View style={[styles.sidebar, { backgroundColor: theme.colors.sidebarBackground, borderRightColor: theme.colors.sidebarBorder }, compact && styles.sidebarCompact]}>
          <View style={[styles.brandWrap, { backgroundColor: theme.colors.logoSurface }]}>
            <Image source={require('../branding/Group 1.png')} resizeMode="contain" style={styles.logoImage} />
          </View>

          <Text style={[styles.sectionLabel, { color: theme.colors.sidebarTextMuted }]}>Navegación</Text>
          {navItems.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => item.enabled !== false && onSelect(item.value)}
              style={[styles.navItem, activeItem === item.value && { backgroundColor: theme.colors.sidebarActive }, item.enabled === false && styles.navItemDisabled]}
            >
              <Text style={[styles.navText, { color: activeItem === item.value ? theme.colors.sidebarText : theme.colors.sidebarTextMuted }, item.enabled === false && styles.navTextDisabled]}>{item.label}</Text>
            </Pressable>
          ))}

          <Pressable onPress={onLogout} style={[styles.signOut, { backgroundColor: theme.colors.sidebarSurface }]}>
            <Text style={[styles.signOutText, { color: theme.colors.sidebarText }]}>Cerrar sesión</Text>
          </Pressable>
        </View>

        <View style={styles.main}>
          <View style={[styles.topbar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }, compact && styles.topbarCompact]}>
            <View style={styles.topbarTitleWrap}>
              <Text style={[styles.topbarEyebrow, { color: theme.colors.accent }]}>Fanix Global</Text>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
            </View>
            <View style={[styles.topbarActions, compact && styles.topbarActionsCompact]}>
              <View style={[styles.companyBadge, { backgroundColor: theme.colors.accentSoft }]}><Text style={[styles.companyText, { color: theme.colors.textPrimary }]} numberOfLines={1}>{companyName}</Text></View>
              <View style={[styles.userBadge, { backgroundColor: theme.colors.surfaceSecondary }]}><Text style={[styles.userText, { color: theme.colors.textPrimary }]}>Admin</Text></View>
              <View accessibilityRole="radiogroup" accessibilityLabel="Apariencia" style={[styles.themeSelector, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                {themeModes.map((option) => {
                  const selected = mode === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setMode(option.value)}
                      accessibilityRole="radio"
                      accessibilityLabel={option.label}
                      accessibilityState={{ selected }}
                      style={[styles.themeOption, selected && { backgroundColor: theme.colors.surfaceElevated }]}
                    >
                      <Text style={[styles.themeOptionText, { color: selected ? theme.colors.accent : theme.colors.textSecondary }]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const themeModes: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
];

const styles = StyleSheet.create({
  page: { flex: 1 },
  shell: { flex: 1, flexDirection: 'row' },
  shellCompact: { flexDirection: 'column' },
  sidebar: {
    width: 240,
    maxWidth: '100%',
    paddingHorizontal: 18,
    paddingVertical: 22,
    borderRightWidth: 1,
  },
  sidebarCompact: { width: '100%', borderRightWidth: 0, borderBottomWidth: 1 },
  brandWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 18 },
  logoImage: { width: 180, height: 56, alignSelf: 'flex-start' },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 10, marginBottom: 10 },
  navItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  navItemDisabled: { opacity: 0.45 },
  navText: { fontSize: 14, fontWeight: '600' },
  navTextDisabled: { opacity: 0.75 },
  signOut: { marginTop: 'auto', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  signOutText: { fontWeight: '700' },
  main: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 26, paddingVertical: 18, borderBottomWidth: 1 },
  topbarCompact: { alignItems: 'flex-start', gap: 12 },
  topbarEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', marginTop: 2 },
  topbarTitleWrap: { flexShrink: 1 },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' },
  topbarActionsCompact: { width: '100%', justifyContent: 'flex-start' },
  companyBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '70%' },
  companyText: { fontWeight: '700', fontSize: 11, letterSpacing: 0.8 },
  userBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  userText: { fontWeight: '700', fontSize: 11 },
  themeSelector: { flexDirection: 'row', padding: 3, borderWidth: 1, borderRadius: 8 },
  themeOption: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6 },
  themeOptionText: { fontSize: 10, fontWeight: '700' },
  content: { padding: 26, gap: 18 },
});
