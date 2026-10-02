import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFanixTheme } from '../../theme/FanixThemeProvider';

type Row = Record<string, unknown>;

export function DataTable({
  rows,
  columns,
  onEdit,
  onDelete,
}: {
  rows: Row[];
  columns: { key: string; label: string }[];
  onEdit?: (row: Row) => void;
  onDelete?: (row: Row) => void;
}) {
  const { theme } = useFanixTheme();
  const hasActions = Boolean(onEdit || onDelete);
  const minWidth = Math.max(520, columns.length * 176 + (hasActions ? 150 : 0));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={[styles.tableWrap, { minWidth, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <View style={[styles.headerRow, { backgroundColor: theme.colors.surfaceSecondary }]}>
          {columns.map((column) => <Text key={column.key} style={[styles.headerCell, { color: theme.colors.textSecondary }]}>{column.label}</Text>)}
          {hasActions ? <Text style={[styles.actionHeader, { color: theme.colors.textSecondary }]}>Acciones</Text> : null}
        </View>
        {rows.map((row, index) => (
          <View key={String(row.id ?? index)} style={[styles.row, { backgroundColor: index % 2 === 0 ? theme.colors.surface : theme.colors.surfaceSecondary, borderTopColor: theme.colors.divider }]}>
            {columns.map((column) => <Text key={column.key} numberOfLines={2} style={[styles.cell, { color: theme.colors.textPrimary }]}>{formatValue(row[column.key])}</Text>)}
            {hasActions ? (
              <View style={styles.actions}>
                {onEdit ? <Pressable accessibilityRole="button" onPress={() => onEdit(row)} style={[styles.actionButton, { borderColor: theme.colors.border }]}><Text style={{ color: theme.colors.accent, fontWeight: '700' }}>Editar</Text></Pressable> : null}
                {onDelete ? <Pressable accessibilityRole="button" onPress={() => onDelete(row)} style={[styles.actionButton, { borderColor: theme.colors.dangerBorder }]}><Text style={{ color: theme.colors.danger, fontWeight: '700' }}>Eliminar</Text></Pressable> : null}
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const styles = StyleSheet.create({
  tableWrap: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 16 },
  headerCell: { flex: 1, minWidth: 150, fontSize: 11, lineHeight: 16, fontWeight: '700', textTransform: 'uppercase' },
  actionHeader: { width: 140, fontSize: 11, lineHeight: 16, fontWeight: '700', textTransform: 'uppercase' },
  row: { flexDirection: 'row', minHeight: 48, alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16, borderTopWidth: 1 },
  cell: { flex: 1, minWidth: 150, fontSize: 13, lineHeight: 19 },
  actions: { width: 140, flexDirection: 'row', gap: 6 },
  actionButton: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 },
});