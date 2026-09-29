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
  container: { padding: 22, alignItems: 'center', justifyContent: 'center', minHeight: 116, borderRadius: 10, borderWidth: 1 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  description: { maxWidth: 420, marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
