import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import fanixTheme from '../../theme/fanixTheme';

export function DataTable({ rows, columns }: { rows: Record<string, string | number | null | undefined>[]; columns: { key: string; label: string }[] }) {
  return (
    <View style={styles.tableWrap}>
      <View style={styles.headerRow}>
        {columns.map((column) => (
          <Text key={column.key} style={styles.headerCell}>{column.label}</Text>
        ))}
      </View>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {columns.map((column) => (
            <Text key={`${index}-${column.key}`} style={styles.cell}>{row[column.key] ?? '-'}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tableWrap: { borderWidth: 1, borderColor: fanixTheme.colors.border, borderRadius: fanixTheme.radius.md, overflow: 'hidden', backgroundColor: fanixTheme.colors.surface },
  headerRow: { flexDirection: 'row', backgroundColor: fanixTheme.colors.surfaceSecondary, paddingVertical: 12, paddingHorizontal: 14 },
  headerCell: { flex: 1, color: fanixTheme.colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: fanixTheme.colors.border },
  cell: { flex: 1, color: fanixTheme.colors.textPrimary, fontSize: 13 },
});
