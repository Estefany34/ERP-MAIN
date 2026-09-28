import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import fanixTheme from '../../theme/fanixTheme';

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center', justifyContent: 'center', minHeight: 120, borderRadius: fanixTheme.radius.md, borderWidth: 1, borderColor: fanixTheme.colors.border, backgroundColor: fanixTheme.colors.surfaceSecondary },
  title: { color: fanixTheme.colors.textPrimary, fontSize: 16, fontWeight: '700' },
  description: { color: fanixTheme.colors.textSecondary, marginTop: 8, textAlign: 'center' },
});
