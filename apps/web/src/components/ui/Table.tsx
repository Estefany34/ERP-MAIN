import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFanixTheme } from '../../theme/FanixThemeProvider';

export function DataTable({ rows, columns }: { rows: Record<string, string | number | null | undefined>[]; columns: { key: string; label: string }[] }) {
  const { theme } = useFanixTheme();
  return (
    <View style={[styles.tableWrap, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
      <View style={[styles.headerRow, { backgroundColor: theme.colors.surfaceSecondary }]}>
        {columns.map((column) => (
          <Text key={column.key} style={[styles.headerCell, { color: theme.colors.textSecondary }]}>{column.label}</Text>
        ))}
      </View>
      {rows.map((row, index) => (
        <View key={index} style={[styles.row, { borderTopColor: theme.colors.divider }]}>
          {columns.map((column) => (
            <Text key={`${index}-${column.key}`} style={[styles.cell, { color: theme.colors.textPrimary }]}>{row[column.key] ?? '-'}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tableWrap: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 14 },
  headerCell: { flex: 1, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: 1 },
  cell: { flex: 1, fontSize: 13 },
});
