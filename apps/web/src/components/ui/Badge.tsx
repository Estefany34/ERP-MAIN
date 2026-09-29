import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFanixTheme } from '../../theme/FanixThemeProvider';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function Badge({ label, variant = 'neutral' }: { label: string; variant?: BadgeVariant }) {
  const { theme } = useFanixTheme();
  const colors = theme.colors;
  const tone = variant === 'neutral'
    ? { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.textSecondary }
    : { backgroundColor: colors[`${variant}Soft`], borderColor: colors[`${variant}Border`], color: colors[variant] };

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.text, { color: tone.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  text: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
});
