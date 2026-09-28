import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFanixTheme } from '../../theme/FanixThemeProvider';

export function LoadingState({ label = 'Cargando...' }: { label?: string }) {
  const { theme } = useFanixTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={theme.colors.accent} />
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  text: { fontWeight: '600' },
});
