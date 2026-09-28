import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import fanixTheme from '../../theme/fanixTheme';

export function LoadingState({ label = 'Cargando...' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={fanixTheme.colors.primary} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  text: { color: fanixTheme.colors.textSecondary, fontWeight: '600' },
});
