import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFanixTheme } from '../../theme/FanixThemeProvider';

export function EmptyState({ title, description }: { title: string; description?: string }) {
  const { theme } = useFanixTheme();
  return (
    <View style={[styles.container, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSecondary }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      {description ? <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center', justifyContent: 'center', minHeight: 120, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  description: { marginTop: 8, textAlign: 'center' },
});
