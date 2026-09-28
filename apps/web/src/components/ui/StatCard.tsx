import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFanixTheme } from '../../theme/FanixThemeProvider';
import { Card } from './Card';

export function StatCard({ label, value, delta }: { label: string; value: string | number; delta?: string }) {
  const { theme } = useFanixTheme();
  return (
    <Card style={styles.card}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{value}</Text>
      {delta ? <Text style={[styles.delta, { color: theme.colors.success }]}>{delta}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 140, padding: 18 },
  label: { fontSize: 12, fontWeight: '600' },
  value: { marginTop: 10, fontSize: 28, fontWeight: '800' },
  delta: { marginTop: 8, fontSize: 12, fontWeight: '600' },
});
