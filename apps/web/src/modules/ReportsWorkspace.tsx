import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Share, Text, TextInput, View } from 'react-native';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { StatCard } from '../components/ui/StatCard';
import { useFanixTheme } from '../theme/FanixThemeProvider';

type Request = (path: string, init?: RequestInit) => Promise<any>;
type Props = { currency: string; request: Request };
type Summary = {
  period: { from: string | null; to: string | null };
  kpis: { customers: number; salesCount: number; salesTotal: number; purchasesCount: number; purchasesTotal: number; income: number; expenses: number; lowStock: number };
  recent: { sales: any[]; purchases: any[]; transactions: any[] };
  inventory: { lowStock: Array<{ id: string; name: string; stock: number; minimum: number }> };
};

export function ReportsWorkspace({ currency, request }: Props) {
  const { theme } = useFanixTheme();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const money = (value: number) => { try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(value); } catch { return String(value); } };
  const query = useMemo(() => { const p = new URLSearchParams(); if (from) p.set('from', from); if (to) p.set('to', to); if (status) p.set('status', status); return p.toString(); }, [from, to, status]);
  const validate = () => { if (from && to && from > to) return 'La fecha inicial no puede ser posterior a la fecha final.'; return ''; };
  async function load() { const issue = validate(); if (issue) { setError(issue); return; } setLoading(true); setError(''); try { setSummary(await request(`reports/summary${query ? `?${query}` : ''}`)); } catch (err) { setSummary(null); setError(err instanceof Error ? err.message : 'No se pudo cargar el reporte.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function exportCsv() {
    const issue = validate(); if (issue) { setError(issue); return; }
    setExporting(true); setError('');
    try {
      // Use the server export so permissions, tenant isolation and audit logging remain authoritative.
      const data = await request(`reports/export.csv${query ? `?${query}` : ''}`, { headers: { Accept: 'text/csv' } });
      const csv = typeof data === 'string' ? data : String(data ?? '');
      if (Platform.OS === 'web') { const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'fanix-sales-report.csv'; a.click(); URL.revokeObjectURL(url); }
      else await Share.share({ message: csv, title: 'Reporte Fanix Global' });
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo exportar el reporte.'); }
    finally { setExporting(false); }
  }
  const button = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.accentSoft, opacity: disabled ? .45 : 1 }}><Text style={{ color: theme.colors.accent, fontWeight: '700' }}>{label}</Text></Pressable>;
  const inputStyle = { minHeight: 44, minWidth: 150, flexGrow: 1, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.inputBorder, borderRadius: 8, padding: 11 } as const;
  return <View style={{ gap: 14 }}>
    <Card style={{ padding: 18, gap: 14 }}>
      <Text style={{ color: theme.colors.textPrimary, fontWeight: '800', fontSize: 20 }}>Reportes empresariales</Text>
      <Text style={{ color: theme.colors.textSecondary }}>Analiza ventas, compras, finanzas e inventario de tu empresa.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <TextInput accessibilityLabel="Fecha inicial" placeholder="Desde: AAAA-MM-DD" placeholderTextColor={theme.colors.inputPlaceholder} value={from} onChangeText={setFrom} style={inputStyle} />
        <TextInput accessibilityLabel="Fecha final" placeholder="Hasta: AAAA-MM-DD" placeholderTextColor={theme.colors.inputPlaceholder} value={to} onChangeText={setTo} style={inputStyle} />
        <TextInput accessibilityLabel="Estado" placeholder="Estado (opcional)" placeholderTextColor={theme.colors.inputPlaceholder} value={status} onChangeText={setStatus} style={inputStyle} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{button('Aplicar filtros', () => void load(), loading)}{button('Limpiar', () => { setFrom(''); setTo(''); setStatus(''); setTimeout(() => void load(), 0); }, loading)}{button(exporting ? 'Exportando…' : 'Exportar CSV', () => void exportCsv(), exporting || loading || !summary)}</View>
      {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text> : null}
    </Card>
    {loading ? <LoadingState label="Generando reporte…" /> : null}
    {!loading && !summary ? <EmptyState title="Reporte no disponible" description="Revisa los filtros o actualiza para volver a intentar." /> : null}
    {summary ? <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatCard label="Ventas" value={money(summary.kpis.salesTotal)} />
        <StatCard label="Compras" value={money(summary.kpis.purchasesTotal)} />
        <StatCard label="Ingresos" value={money(summary.kpis.income)} />
        <StatCard label="Gastos" value={money(summary.kpis.expenses)} />
        <StatCard label="Balance" value={money(summary.kpis.income - summary.kpis.expenses)} />
        <StatCard label="Clientes" value={summary.kpis.customers} />
        <StatCard label="Stock bajo" value={summary.kpis.lowStock} />
      </View>
      <Card style={{ padding: 18, gap: 10 }}><Text style={{ color: theme.colors.textPrimary, fontWeight: '800', fontSize: 18 }}>Resumen del periodo</Text><Text style={{ color: theme.colors.textSecondary }}>{summary.kpis.salesCount} ventas · {summary.kpis.purchasesCount} compras</Text><Text style={{ color: theme.colors.textSecondary }}>Periodo: {summary.period.from || 'inicio'} — {summary.period.to || 'actualidad'}</Text></Card>
      <Card style={{ padding: 18, gap: 10 }}><Text style={{ color: theme.colors.textPrimary, fontWeight: '800', fontSize: 18 }}>Inventario bajo</Text>{summary.inventory.lowStock.length ? summary.inventory.lowStock.map(item => <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><Text style={{ color: theme.colors.textPrimary, flex: 1 }}>{item.name}</Text><Text style={{ color: theme.colors.textSecondary }}>Stock {item.stock} · mínimo {item.minimum}</Text></View>) : <EmptyState title="Sin alertas" description="No hay productos debajo del mínimo." />}</Card>
      <Card style={{ padding: 18, gap: 10 }}><Text style={{ color: theme.colors.textPrimary, fontWeight: '800', fontSize: 18 }}>Actividad reciente</Text><Text style={{ color: theme.colors.textSecondary }}>Ventas: {summary.recent.sales.length} · Compras: {summary.recent.purchases.length} · Movimientos financieros: {summary.recent.transactions.length}</Text></Card>
    </> : null}
  </View>;
}
