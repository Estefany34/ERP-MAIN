import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import fanixTheme from '../../theme/fanixTheme';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function Badge({ label, variant = 'neutral' }: { label: string; variant?: BadgeVariant }) {
  return (
    <View style={[styles.badge, stylesMap[variant]]}>
      <Text style={[styles.text, variant === 'neutral' ? styles.neutralText : styles.accentText]}>{label}</Text>
    </View>
  );
}

const stylesMap = StyleSheet.create({
  success: { backgroundColor: `${fanixTheme.colors.success}1A`, borderColor: `${fanixTheme.colors.success}66` },
  warning: { backgroundColor: `${fanixTheme.colors.warning}1A`, borderColor: `${fanixTheme.colors.warning}66` },
  danger: { backgroundColor: `${fanixTheme.colors.danger}1A`, borderColor: `${fanixTheme.colors.danger}66` },
  info: { backgroundColor: `${fanixTheme.colors.info}1A`, borderColor: `${fanixTheme.colors.info}66` },
  neutral: { backgroundColor: `${fanixTheme.colors.primaryLight}`, borderColor: `${fanixTheme.colors.primary}33` },
});

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  accentText: { color: fanixTheme.colors.textPrimary },
  neutralText: { color: fanixTheme.colors.primaryDark },
});
