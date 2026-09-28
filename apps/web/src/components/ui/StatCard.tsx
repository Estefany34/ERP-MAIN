import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import fanixTheme from '../../theme/fanixTheme';
import { Card } from './Card';

export function StatCard({ label, value, delta }: { label: string; value: string | number; delta?: string }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {delta ? <Text style={styles.delta}>{delta}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 140, padding: 18 },
  label: { color: fanixTheme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  value: { marginTop: 10, color: fanixTheme.colors.textPrimary, fontSize: 28, fontWeight: '800' },
  delta: { marginTop: 8, color: fanixTheme.colors.success, fontSize: 12, fontWeight: '600' },
});
