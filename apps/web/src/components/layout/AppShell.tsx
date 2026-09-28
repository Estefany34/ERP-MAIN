import React from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import fanixTheme from '../../theme/fanixTheme';

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
  subtitle: string;
  navItems: NavItem[];
  activeItem: string;
  onSelect: (value: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.shell}>
        <View style={styles.sidebar}>
          <View style={styles.brandWrap}>
            <Image source={require('../branding/Group 1.png')} resizeMode="contain" style={styles.logoImage} />
          </View>

          <Text style={styles.sectionLabel}>Navegación</Text>
          {navItems.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => item.enabled !== false && onSelect(item.value)}
              style={[styles.navItem, activeItem === item.value && styles.navItemActive, item.enabled === false && styles.navItemDisabled]}
            >
              <Text style={[styles.navText, activeItem === item.value && styles.navTextActive, item.enabled === false && styles.navTextDisabled]}>{item.label}</Text>
            </Pressable>
          ))}

          <Pressable onPress={onLogout} style={styles.signOut}>
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </View>

        <View style={styles.main}>
          <View style={styles.topbar}>
            <View>
              <Text style={styles.topbarEyebrow}>Fanix Global</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
            <View style={styles.topbarActions}>
              <View style={styles.companyBadge}><Text style={styles.companyText}>EMPRESA DEMO</Text></View>
              <View style={styles.userBadge}><Text style={styles.userText}>Admin</Text></View>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: fanixTheme.colors.background },
  shell: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 240,
    backgroundColor: fanixTheme.colors.primaryDark,
    paddingHorizontal: 18,
    paddingVertical: 22,
    borderRightWidth: 1,
    borderRightColor: '#1A2F52',
  },
  brandWrap: { flexDirection: 'row', alignItems: 'center', paddingBottom: 18 },
  logoImage: { width: 180, height: 56, alignSelf: 'flex-start' },
  sectionLabel: { color: '#9BB9E7', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 10, marginBottom: 10 },
  navItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  navItemActive: { backgroundColor: '#16315E' },
  navItemDisabled: { opacity: 0.45 },
  navText: { color: '#D7E3F7', fontSize: 14, fontWeight: '600' },
  navTextActive: { color: '#FFFFFF', fontWeight: '700' },
  navTextDisabled: { color: '#B4C2D8' },
  signOut: { marginTop: 'auto', backgroundColor: '#12315A', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  signOutText: { color: '#D8E6FF', fontWeight: '700' },
  main: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 26, paddingVertical: 18, backgroundColor: fanixTheme.colors.surface, borderBottomWidth: 1, borderBottomColor: fanixTheme.colors.border },
  topbarEyebrow: { color: fanixTheme.colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: fanixTheme.colors.textPrimary, fontSize: 28, fontWeight: '800', marginTop: 2 },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  companyBadge: { backgroundColor: fanixTheme.colors.primaryLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  companyText: { color: fanixTheme.colors.primaryDark, fontWeight: '700', fontSize: 11, letterSpacing: 0.8 },
  userBadge: { backgroundColor: fanixTheme.colors.surfaceSecondary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  userText: { color: fanixTheme.colors.textPrimary, fontWeight: '700', fontSize: 11 },
  content: { padding: 26, gap: 18 },
});
