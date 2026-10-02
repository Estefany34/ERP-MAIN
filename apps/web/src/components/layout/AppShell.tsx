import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { FanixLogo } from '../branding/FanixLogo';
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
  userLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  activeItem: string;
  onSelect: (value: string) => void;
  onLogout: () => void;
  userLabel?: string;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const companyName = subtitle?.trim() || 'Empresa';
  const { theme, mode, setMode, isDark } = useFanixTheme();
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const [hoveredTheme, setHoveredTheme] = React.useState<string | null>(null);
  const [logoutHovered, setLogoutHovered] = React.useState(false);

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.shell, compact && styles.shellCompact]}>
        <View style={[styles.sidebar, { backgroundColor: theme.colors.sidebarBackground, borderRightColor: theme.colors.sidebarBorder }, compact && styles.sidebarCompact]}>
          <View style={[styles.brandWrap, compact && styles.brandWrapCompact]}>
            <FanixLogo compact variant="inverse" />
            {compact ? (
              <Pressable onPress={onLogout} onHoverIn={() => setLogoutHovered(true)} onHoverOut={() => setLogoutHovered(false)} accessibilityRole="button" style={[styles.compactLogout, logoutHovered && { backgroundColor: theme.colors.sidebarSurface }]}>
                <Text style={[styles.signOutText, { color: theme.colors.sidebarText }]}>Cerrar sesión</Text>
              </Pressable>
            ) : null}
          </View>

          {!compact ? <Text style={[styles.sectionLabel, { color: theme.colors.sidebarTextMuted }]}>Navegación</Text> : null}
          <ScrollView
            horizontal={compact}
            showsHorizontalScrollIndicator={false}
            style={compact ? styles.navScrollCompact : styles.navScroll}
            contentContainerStyle={compact ? styles.navRail : styles.navList}
          >
            {navItems.map((item) => {
              const selected = activeItem === item.value;
              const hovered = hoveredItem === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => item.enabled !== false && onSelect(item.value)}
                  onHoverIn={() => setHoveredItem(item.value)}
                  onHoverOut={() => setHoveredItem(null)}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: item.enabled === false }}
                  style={[
                    styles.navItem,
                    compact && styles.navItemCompact,
                    selected && { backgroundColor: theme.colors.sidebarActive, borderColor: theme.colors.sidebarBorder, borderLeftColor: theme.colors.accentBright },
                    hovered && !selected && { backgroundColor: theme.colors.sidebarSurface },
                    item.enabled === false && styles.navItemDisabled,
                  ]}
                >
                  <Text numberOfLines={1} style={[styles.navText, { color: selected ? theme.colors.sidebarText : theme.colors.sidebarTextMuted }, item.enabled === false && styles.navTextDisabled]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {!compact ? (
            <Pressable onPress={onLogout} onHoverIn={() => setLogoutHovered(true)} onHoverOut={() => setLogoutHovered(false)} accessibilityRole="button" style={[styles.signOut, { borderColor: theme.colors.sidebarBorder, backgroundColor: logoutHovered ? theme.colors.sidebarSurface : 'transparent' }]}>
              <Text style={[styles.signOutText, { color: theme.colors.sidebarText }]}>Cerrar sesión</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.main}>
          <View style={[styles.topbar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }, compact && styles.topbarCompact]}>
            <View style={styles.topbarTitleWrap}>
              <Text style={[styles.topbarEyebrow, { color: theme.colors.accent }]}>Fanix Global</Text>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
            </View>
            <View style={[styles.topbarActions, compact && styles.topbarActionsCompact]}>
              <View style={[styles.companyBadge, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}><Text style={[styles.companyText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{companyName}</Text></View>
              <View style={[styles.userBadge, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}><Text style={[styles.userText, { color: theme.colors.textSecondary }]}>{userLabel || 'Usuario'}</Text></View>
              <View accessibilityRole="radiogroup" accessibilityLabel="Apariencia" style={[styles.themeSelector, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                {themeModes.map((option) => {
                  const selected = mode === option.value;
                  const hovered = hoveredTheme === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setMode(option.value)}
                      onHoverIn={() => setHoveredTheme(option.value)}
                      onHoverOut={() => setHoveredTheme(null)}
                      accessibilityRole="radio"
                      accessibilityLabel={option.label}
                      accessibilityState={{ selected }}
                      style={[
                        styles.themeOption,
                        selected && { backgroundColor: theme.colors.accentSoft },
                        hovered && !selected && { backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <Text style={[styles.themeOptionText, { color: selected ? theme.colors.accent : theme.colors.textSecondary }]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={[styles.contentArea, { backgroundColor: theme.colors.background }]}>
            {isDark ? (
              <View style={[StyleSheet.absoluteFillObject, styles.ambientLayers]}>
                <LinearGradient
                  colors={theme.colors.contentAmbient}
                  locations={[0, 0.25, 0.6, 1]}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.ambientTopRight}
                />
              </View>
            ) : null}
            <ScrollView contentContainerStyle={[styles.content, compact && styles.contentCompact]}>{children}</ScrollView>
          </View>
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
    width: 248,
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRightWidth: 1,
  },
  sidebarCompact: { width: '100%', paddingHorizontal: 14, paddingVertical: 10, borderRightWidth: 0, borderBottomWidth: 1 },
  brandWrap: { alignItems: 'center', paddingHorizontal: 2, marginBottom: 22 },
  brandWrapCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  compactLogout: { position: 'absolute', right: 0, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  navScroll: { flex: 1 },
  navScrollCompact: { flexGrow: 0, minHeight: 42 },
  navList: { flexGrow: 1, gap: 3 },
  navRail: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12 },
  navItem: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', borderLeftWidth: 3 },
  navItemCompact: { minHeight: 36, paddingVertical: 7, paddingHorizontal: 9 },
  navItemDisabled: { opacity: 0.45 },
  navText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  navTextDisabled: { opacity: 0.75 },
  signOut: { marginTop: 'auto', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'flex-start' },
  signOutText: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  pressed: { opacity: 0.82 },
  main: { flex: 1 },
  contentArea: { flex: 1, position: 'relative' },
  ambientLayers: { pointerEvents: 'none' },
  ambientTopRight: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  ambientBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '50%',
    height: '45%',
    pointerEvents: 'none',
  },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20, paddingHorizontal: 28, paddingVertical: 16, borderBottomWidth: 1 },
  topbarCompact: { flexDirection: 'column', alignItems: 'flex-start', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  topbarEyebrow: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 25, lineHeight: 32, fontWeight: '700', marginTop: 2 },
  topbarTitleWrap: { flexShrink: 1 },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  topbarActionsCompact: { width: '100%', justifyContent: 'flex-start', gap: 7 },
  companyBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, maxWidth: 220 },
  companyText: { fontWeight: '600', fontSize: 12, lineHeight: 16 },
  userBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  userText: { fontWeight: '600', fontSize: 12, lineHeight: 16 },
  themeSelector: { flexDirection: 'row', padding: 3, borderWidth: 1, borderRadius: 9 },
  themeOption: { minHeight: 31, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 5 },
  themeOptionText: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
  content: { padding: 28, gap: 20 },
  contentCompact: { padding: 16, gap: 16 },
});
