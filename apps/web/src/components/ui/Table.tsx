import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFanixTheme } from '../../theme/FanixThemeProvider';

export function DataTable({ rows, columns, actions, disabled }: { rows: Record<string, string | number | null | undefined>[]; columns: { key: string; label: string }[]; actions?: (row: Record<string, string | number | null | undefined>, index: number) => { label: string; onPress: () => void }[]; disabled?: boolean }) {
  const { theme } = useFanixTheme();
  const { width } = useWindowDimensions();
  const actionButtons = (row: Record<string, string | number | null | undefined>, index: number) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{actions?.(row, index).map(action => <Pressable key={action.label} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={action.onPress} style={{ minHeight: 44, padding: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, opacity: disabled ? 0.45 : 1 }}><Text style={{ color: theme.colors.accent }}>{action.label}</Text></Pressable>)}</View>;
  if (width < 640) return <View style={{ gap: 12 }}>{rows.map((row, index) => <View key={row.id ?? index} style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 14, gap: 10, backgroundColor: theme.colors.surface }}>{columns.map(column => <View key={column.key} style={{ gap: 3 }}><Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{column.label}</Text><Text selectable style={{ color: theme.colors.textPrimary }}>{String(row[column.key] ?? '—')}</Text></View>)}{actionButtons(row, index)}</View>)}</View>;
  const minWidth = Math.max(520, columns.length * 176 + (actions ? 250 : 0));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={[styles.tableWrap, { minWidth, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <View style={[styles.headerRow, { backgroundColor: theme.colors.surfaceSecondary }]}>
          {columns.map((column) => (
            <Text key={column.key} style={[styles.headerCell, { color: theme.colors.textSecondary }]}>{column.label}</Text>
          ))}
          {actions ? <Text style={[styles.headerCell, { color: theme.colors.textSecondary }]}>Acciones</Text> : null}
        </View>
        {rows.map((row, index) => (
          <View key={row.id ?? index} style={[styles.row, { backgroundColor: index % 2 === 0 ? theme.colors.surface : theme.colors.surfaceSecondary, borderTopColor: theme.colors.divider }]}>
            {columns.map((column) => (
              <Text key={`${index}-${column.key}`} numberOfLines={2} style={[styles.cell, { color: theme.colors.textPrimary }]}>{String(row[column.key] ?? '—')}</Text>
            ))}
            {actions ? <View style={{ flex: 1, minWidth: 200 }}>{actionButtons(row, index)}</View> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tableWrap: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 16 },
  headerCell: { flex: 1, minWidth: 150, fontSize: 11, lineHeight: 16, fontWeight: '700', textTransform: 'uppercase' },
  row: { flexDirection: 'row', minHeight: 48, alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16, borderTopWidth: 1 },
  cell: { flex: 1, minWidth: 150, fontSize: 13, lineHeight: 19 },
});
