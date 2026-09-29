import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFanixTheme } from '../../theme/FanixThemeProvider';
import { Card } from './Card';

export function StatCard({ label, value, delta }: { label: string; value: string | number; delta?: string }) {
  const { theme } = useFanixTheme();
  return (
    <Card variant="elevated" style={styles.card}>
      <View style={[styles.accentLine, { backgroundColor: theme.colors.accent }]} />
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{value}</Text>
      {delta ? <Text style={[styles.delta, { color: theme.colors.success }]}>{delta}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 150, padding: 18 },
  accentLine: { width: 26, height: 3, borderRadius: 2, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  value: { marginTop: 6, fontSize: 30, lineHeight: 36, fontWeight: '700' },
  delta: { marginTop: 8, fontSize: 12, fontWeight: '600', lineHeight: 17 },
});
