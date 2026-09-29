import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFanixTheme } from '../../theme/FanixThemeProvider';

export function DataTable({ rows, columns }: { rows: Record<string, string | number | null | undefined>[]; columns: { key: string; label: string }[] }) {
  const { theme } = useFanixTheme();
  const minWidth = Math.max(520, columns.length * 176);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={[styles.tableWrap, { minWidth, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <View style={[styles.headerRow, { backgroundColor: theme.colors.surfaceSecondary }]}>
          {columns.map((column) => (
            <Text key={column.key} style={[styles.headerCell, { color: theme.colors.textSecondary }]}>{column.label}</Text>
          ))}
        </View>
        {rows.map((row, index) => (
          <View key={index} style={[styles.row, { backgroundColor: index % 2 === 0 ? theme.colors.surface : theme.colors.surfaceSecondary, borderTopColor: theme.colors.divider }]}>
            {columns.map((column) => (
              <Text key={`${index}-${column.key}`} numberOfLines={2} style={[styles.cell, { color: theme.colors.textPrimary }]}>{row[column.key] ?? '-'}</Text>
            ))}
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
