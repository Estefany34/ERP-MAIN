import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '../components/ui/Card';
import { DataTable } from '../components/ui/Table';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { StatCard } from '../components/ui/StatCard';
import { useFanixTheme } from '../theme/FanixThemeProvider';
import {
  createReportExcel,
  createReportPdf,
  downloadReportFile,
  type ReportExportInput,
} from '../services/reportExport';

type ReportType = 'sales' | 'purchases' | 'inventory' | 'finance' | 'customers' | 'executive';
type ReportFilters = {
  from?: string;
  to?: string;
  status?: string;
  customerId?: string;
  supplierId?: string;
  transactionType?: 'income' | 'expense';
  movementType?: 'in' | 'out';
  search?: string;
};
type ReportColumn = { key: string; label: string; format?: 'currency' | 'date' | 'number' | 'text' };
type ReportKpi = { key: string; label: string; value: number; format?: 'currency' | 'number' };
type ReportData = {
  type: ReportType;
  title: string;
  company: { name: string; currency: string };
  period: { from: string | null; to: string | null };
  filters: ReportFilters;
  columns: ReportColumn[];
  kpis: ReportKpi[];
  rows: Record<string, unknown>[];
};
type ReportOptions = {
  company: { name: string; currency: string };
  customers: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
};
type Request = (path: string, init?: RequestInit) => Promise<unknown>;
type Choice = { label: string; value: string };

const reportTypes: { label: string; value: ReportType }[] = [
  { label: 'Ventas', value: 'sales' },
  { label: 'Compras', value: 'purchases' },
  { label: 'Inventario', value: 'inventory' },
  { label: 'Finanzas', value: 'finance' },
  { label: 'Clientes', value: 'customers' },
  { label: 'Ejecutivo / General', value: 'executive' },
];
const salesStatuses: Choice[] = [{ label: 'Todas', value: '' }, { label: 'Confirmada', value: 'confirmed' }];
const purchaseStatuses: Choice[] = [
  { label: 'Todos', value: '' }, { label: 'Borrador', value: 'draft' },
  { label: 'Aprobada', value: 'approved' }, { label: 'Recibida', value: 'received' },
  { label: 'Rechazada', value: 'rejected' },
];
const financeStatuses: Choice[] = [
  { label: 'Todos', value: '' }, { label: 'Pendiente', value: 'pending' }, { label: 'Pagado', value: 'paid' },
];
const financeTypes: Choice[] = [
  { label: 'Todos', value: '' }, { label: 'Ingreso', value: 'income' }, { label: 'Egreso', value: 'expense' },
];
const movementTypes: Choice[] = [
  { label: 'Todos', value: '' }, { label: 'Entradas', value: 'in' }, { label: 'Salidas', value: 'out' },
];
const reportPermissions: Record<ReportType, string[]> = {
  sales: ['sales.view'],
  purchases: ['purchases.view'],
  inventory: ['inventory.view'],
  finance: ['finance.view'],
  customers: ['customers.view'],
  executive: ['sales.view', 'purchases.view', 'finance.view', 'inventory.view', 'customers.view'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReportType(value: unknown): value is ReportType {
  return reportTypes.some(item => item.value === value);
}

function isColumnFormat(value: unknown): value is ReportColumn['format'] {
  return value === undefined || value === 'currency' || value === 'date' || value === 'number' || value === 'text';
}

function isKpiFormat(value: unknown): value is ReportKpi['format'] {
  return value === undefined || value === 'currency' || value === 'number';
}

function nullableString(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  throw new Error('El servidor devolvió metadatos de reporte inválidos.');
}

function parseReportOptions(value: unknown): ReportOptions {
  if (!isRecord(value) || !isRecord(value.company)) {
    throw new Error('El servidor devolvió opciones de reporte incompletas.');
  }
  const parseChoices = (items: unknown): { id: string; name: string }[] => {
    if (!Array.isArray(items)) throw new Error('El servidor devolvió opciones de filtro inválidas.');
    const choices: { id: string; name: string }[] = [];
    for (const item of items) {
      if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') throw new Error('El servidor devolvió opciones de filtro inválidas.');
      choices.push({ id: item.id, name: item.name });
    }
    return choices;
  };
  const companyName = value.company.name;
  const currency = value.company.currency;
  if (typeof companyName !== 'string' || typeof currency !== 'string') throw new Error('El servidor devolvió opciones de reporte incompletas.');
  return {
    company: { name: companyName, currency },
    customers: parseChoices(value.customers),
    suppliers: parseChoices(value.suppliers),
  };
}

function parseReportData(value: unknown): ReportData {
  if (!isRecord(value) || !isReportType(value.type) || typeof value.title !== 'string' || !isRecord(value.company) || !isRecord(value.period) || !isRecord(value.filters) ||
    !Array.isArray(value.columns) || !Array.isArray(value.kpis) || !Array.isArray(value.rows)) throw new Error('El servidor devolvió un reporte incompleto.');
  const type = value.type;
  const title = value.title;
  const companyName = value.company.name;
  const currency = value.company.currency;
  const periodFrom = nullableString(value.period.from);
  const periodTo = nullableString(value.period.to);
  if (typeof companyName !== 'string' || typeof currency !== 'string') throw new Error('El servidor devolvió metadatos de reporte inválidos.');
  const columns: ReportColumn[] = [];
  for (const column of value.columns) {
    if (!isRecord(column) || typeof column.key !== 'string' || typeof column.label !== 'string' || !isColumnFormat(column.format)) {
      throw new Error('El servidor devolvió columnas de reporte inválidas.');
    }
    columns.push({ key: column.key, label: column.label, format: column.format });
  }
  const kpis: ReportKpi[] = [];
  for (const kpi of value.kpis) {
    if (!isRecord(kpi) || typeof kpi.key !== 'string' || typeof kpi.label !== 'string' || typeof kpi.value !== 'number' ||
      !Number.isFinite(kpi.value) || !isKpiFormat(kpi.format)) throw new Error('El servidor devolvió indicadores de reporte inválidos.');
    kpis.push({ key: kpi.key, label: kpi.label, value: kpi.value, format: kpi.format });
  }
  const rows: Record<string, unknown>[] = [];
  for (const row of value.rows) {
    if (!isRecord(row)) throw new Error('El servidor devolvió filas de reporte inválidas.');
    rows.push(row);
  }
  const rawFilters = value.filters;
  const filters: ReportFilters = {};
  for (const key of ['from', 'to', 'status', 'customerId', 'supplierId', 'search'] as const) {
    const filter = rawFilters[key];
    if (filter !== undefined) {
      if (typeof filter !== 'string') throw new Error('El servidor devolvió filtros de reporte inválidos.');
      filters[key] = filter;
    }
  }
  const transactionType = rawFilters.transactionType;
  if (transactionType !== undefined) {
    if (transactionType !== 'income' && transactionType !== 'expense') throw new Error('El servidor devolvió filtros de reporte inválidos.');
    filters.transactionType = transactionType;
  }
  const movementType = rawFilters.movementType;
  if (movementType !== undefined) {
    if (movementType !== 'in' && movementType !== 'out') throw new Error('El servidor devolvió filtros de reporte inválidos.');
    filters.movementType = movementType;
  }
  return {
    type,
    title,
    company: { name: companyName, currency },
    period: { from: periodFrom, to: periodTo },
    filters,
    columns,
    kpis,
    rows,
  };
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateLabel(value: string | null): string {
  if (!value) return 'Sin límite';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function formatValue(value: unknown, format: ReportColumn['format'], currency: string): string | number | null {
  if (value == null || value === '') return '—';
  if (format === 'currency' && typeof value === 'number') {
    try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value); }
    catch { return String(value); }
  }
  if (format === 'number' && typeof value === 'number') return new Intl.NumberFormat('es-MX').format(value);
  if (format === 'date') {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) return value.map(item => typeof item === 'string' || typeof item === 'number' ? String(item) : '').filter(Boolean).join(', ');
  return '—';
}

function reportCellFormat(row: Record<string, unknown>, column: ReportColumn): ReportColumn['format'] {
  if (column.key === 'value' && (row.format === 'currency' || row.format === 'number')) return row.format;
  return column.format;
}

export function ReportsWorkspace({ currency, companyName, canExport, permissions, request }: { currency: string; companyName: string; canExport: boolean; permissions: string[]; request: Request }) {
  const { theme } = useFanixTheme();
  const availableReportTypes = reportTypes.filter(item => reportPermissions[item.value].every(permission => permissions.includes(permission)));
  const [options, setOptions] = useState<ReportOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [reportType, setReportType] = useState<ReportType>(() => availableReportTypes[0]?.value ?? 'sales');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [report, setReport] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const exportingLock = useRef(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    let current = true;
    setOptionsLoading(true);
    request('reports/options')
      .then(data => { if (current) setOptions(parseReportOptions(data)); })
      .catch((err: unknown) => { if (current) setError(err instanceof Error ? err.message : 'No se pudieron cargar los filtros del reporte.'); })
      .finally(() => { if (current) setOptionsLoading(false); });
    return () => { current = false; };
  }, []);

  const setFilter = (key: keyof ReportFilters, value: string) => {
    setFilters(previous => ({ ...previous, [key]: value || undefined }));
    setReport(null);
    setSuccess('');
    setValidationError('');
  };

  function selectReport(type: string) {
    const selected = availableReportTypes.find(item => item.value === type);
    if (!selected) return;
    setReportType(selected.value);
    setFilters(previous => ({ from: previous.from, to: previous.to }));
    setReport(null);
    setError('');
    setSuccess('');
    setValidationError('');
  }

  function validateFilters(): boolean {
    if (filters.from && !isValidDate(filters.from)) { setValidationError('La fecha inicial no es válida. Usa el formato AAAA-MM-DD.'); return false; }
    if (filters.to && !isValidDate(filters.to)) { setValidationError('La fecha final no es válida. Usa el formato AAAA-MM-DD.'); return false; }
    if (filters.from && filters.to && filters.from > filters.to) { setValidationError('La fecha inicial no puede ser posterior a la fecha final.'); return false; }
    setValidationError('');
    return true;
  }

  async function generateReport() {
    if (generating || exporting || optionsLoading || !validateFilters()) return;
    setGenerating(true);
    setReport(null);
    setError('');
    setSuccess('');
    try {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
      const suffix = query.size ? `?${query.toString()}` : '';
      const response = await request(`${reportType === 'executive' ? 'reports/summary' : `reports/${reportType}`}${suffix}`);
      const result = parseReportData(reportType === 'executive' && isRecord(response) ? response.report : reportType === 'executive' ? undefined : response);
      setReport(result);
      setSuccess('Reporte generado correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el reporte. Intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  }

  function filterDescription(data: ReportData): string {
    const parts = [`Periodo: ${dateLabel(data.period.from)} - ${dateLabel(data.period.to)}`];
    if (data.filters.status) parts.push(`Estado: ${data.filters.status}`);
    if (data.filters.transactionType) parts.push(`Movimiento: ${data.filters.transactionType === 'income' ? 'Ingreso' : 'Egreso'}`);
    if (data.filters.movementType) parts.push(`Movimiento: ${data.filters.movementType === 'in' ? 'Entrada' : 'Salida'}`);
    if (data.filters.customerId) parts.push(`Cliente: ${options?.customers.find(customer => customer.id === data.filters.customerId)?.name ?? 'Seleccionado'}`);
    if (data.filters.supplierId) parts.push(`Proveedor: ${options?.suppliers.find(supplier => supplier.id === data.filters.supplierId)?.name ?? 'Seleccionado'}`);
    if (data.filters.search) parts.push(`Búsqueda: ${data.filters.search}`);
    return parts.join(' · ');
  }

  async function exportReport(format: 'pdf' | 'xlsx') {
    if (!report || !report.rows.length || !canExport || exportingLock.current || generating) return;
    exportingLock.current = true;
    setExporting(format);
    setError('');
    setSuccess('');
    try {
      const generatedAt = new Date();
      const exportInput: ReportExportInput = {
        type: report.type,
        title: report.title,
        companyName: options?.company.name ?? companyName,
        currency: report.company.currency || options?.company.currency || currency,
        period: report.period,
        filtersLabel: filterDescription(report),
        generatedAt,
        columns: report.columns,
        kpis: report.kpis,
        rows: report.rows,
      };
      const file = format === 'pdf' ? createReportPdf(exportInput) : new Blob(
        [createReportExcel(exportInput)],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      );
      const audit = await request('reports/export-audit', {
        method: 'POST',
        body: JSON.stringify({ type: report.type, format, filters: report.filters }),
      }) as { recorded?: boolean; rows?: number };
      if (!audit.recorded || audit.rows !== report.rows.length) throw new Error('El reporte cambió antes de exportarse. Genéralo de nuevo para mantener la auditoría consistente.');
      downloadReportFile(file, report.type, format, generatedAt);
      setSuccess(`Reporte ${format === 'pdf' ? 'PDF' : 'Excel'} generado correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? `No se pudo exportar el reporte: ${err.message}` : 'No se pudo exportar el reporte. Intenta de nuevo.');
    } finally {
      exportingLock.current = false;
      setExporting(null);
    }
  }

  const isBusy = generating || exporting !== null;
  const label = availableReportTypes.find(item => item.value === reportType)?.label ?? 'Ventas';
  const button = (text: string, onPress: () => void, disabled = false) => (
    <Pressable key={text} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={{ minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: disabled ? theme.colors.disabledSurface : theme.colors.accentSoft, opacity: disabled ? 0.55 : 1 }}>
      <Text style={{ color: disabled ? theme.colors.disabledText : theme.colors.accent, fontWeight: '700' }}>{text}</Text>
    </Pressable>
  );

  const statusChoices = reportType === 'sales' ? salesStatuses : reportType === 'purchases' ? purchaseStatuses : reportType === 'finance' ? financeStatuses : null;
  const viewRows = report?.rows.map(row => {
    const display: Record<string, string | number | null | undefined> = {};
    for (const column of report.columns) display[column.key] = formatValue(row[column.key], reportCellFormat(row, column), report.company.currency);
    return display;
  }) ?? [];

  return (
    <Card style={{ padding: 18, gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ color: theme.colors.textPrimary, fontWeight: '800', fontSize: 20 }}>REPORTES</Text>
        <Text style={{ color: theme.colors.textSecondary }}>{options?.company.name ?? companyName}</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <SelectField label="Tipo de reporte" value={reportType} choices={availableReportTypes} onChange={selectReport} disabled={isBusy} />
        <DateField label="Desde" value={filters.from ?? ''} onChange={value => setFilter('from', value)} disabled={isBusy} />
        <DateField label="Hasta" value={filters.to ?? ''} onChange={value => setFilter('to', value)} disabled={isBusy} />
        {statusChoices ? <SelectField label="Estado" value={filters.status ?? ''} choices={statusChoices} onChange={value => setFilter('status', value)} disabled={isBusy} /> : null}
        {reportType === 'sales' ? <SelectField label="Cliente" value={filters.customerId ?? ''} choices={[{ label: 'Todos', value: '' }, ...(options?.customers ?? []).map(customer => ({ label: customer.name, value: customer.id }))]} onChange={value => setFilter('customerId', value)} disabled={isBusy || optionsLoading} /> : null}
        {reportType === 'purchases' ? <SelectField label="Proveedor" value={filters.supplierId ?? ''} choices={[{ label: 'Todos', value: '' }, ...(options?.suppliers ?? []).map(supplier => ({ label: supplier.name, value: supplier.id }))]} onChange={value => setFilter('supplierId', value)} disabled={isBusy || optionsLoading} /> : null}
        {reportType === 'finance' ? <SelectField label="Tipo de movimiento" value={filters.transactionType ?? ''} choices={financeTypes} onChange={value => setFilter('transactionType', value)} disabled={isBusy} /> : null}
        {reportType === 'inventory' ? <SelectField label="Movimiento" value={filters.movementType ?? ''} choices={movementTypes} onChange={value => setFilter('movementType', value)} disabled={isBusy} /> : null}
        {reportType === 'customers' ? <View style={{ flex: 1, minWidth: 180, gap: 5 }}>
          <Text style={{ color: theme.colors.textSecondary }}>Buscar cliente</Text>
          <TextInput accessibilityLabel="Buscar cliente en reportes" value={filters.search ?? ''} onChangeText={value => setFilter('search', value)} editable={!isBusy} placeholder="Nombre o correo" placeholderTextColor={theme.colors.inputPlaceholder}
            style={{ color: theme.colors.textPrimary, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, borderWidth: 1, borderRadius: 8, minHeight: 44, paddingHorizontal: 12 }} />
        </View> : null}
      </View>

      {optionsLoading ? <LoadingState label="Cargando filtros…" /> : null}
      {validationError ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{validationError}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text> : null}
      {success ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.success }}>{success}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {button(generating ? 'Generando reporte…' : 'Generar reporte', () => void generateReport(), isBusy || optionsLoading)}
      </View>
      {canExport
        ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {button(exporting === 'pdf' ? 'Generando PDF…' : 'Exportar PDF', () => void exportReport('pdf'), isBusy || optionsLoading || Boolean(error) || !report?.rows.length)}
          {button(exporting === 'xlsx' ? 'Generando Excel…' : 'Exportar Excel', () => void exportReport('xlsx'), isBusy || optionsLoading || Boolean(error) || !report?.rows.length)}
        </View>
        : <Text style={{ color: theme.colors.textSecondary }}>Tu rol puede consultar reportes, pero no tiene permiso para exportarlos.</Text>}

      {generating ? <LoadingState label="Generando reporte…" /> : null}
      {report ? <>
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 }}>RESUMEN</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {report.kpis.map(kpi => {
              let value: string | number = kpi.value;
              if (kpi.format === 'currency') {
                try { value = new Intl.NumberFormat('es-MX', { style: 'currency', currency: report.company.currency }).format(kpi.value); }
                catch { value = String(kpi.value); }
              } else value = new Intl.NumberFormat('es-MX').format(kpi.value);
              return <StatCard key={kpi.key} label={kpi.label} value={value} />;
            })}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 }}>DETALLE DEL REPORTE</Text>
          <Text style={{ color: theme.colors.textSecondary }}>{label} · {report.rows.length} registros</Text>
          {report.rows.length
            ? <DataTable rows={viewRows} columns={report.columns} />
            : <EmptyState title="Sin registros para estos filtros" description="Ajusta el periodo o los filtros y genera el reporte de nuevo." />}
        </View>
      </> : null}
    </Card>
  );
}

function DateField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
  const { theme } = useFanixTheme();
  return <View style={{ flex: 1, minWidth: 150, gap: 5 }}>
    <Text style={{ color: theme.colors.textSecondary }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} placeholder="AAAA-MM-DD" placeholderTextColor={theme.colors.inputPlaceholder}
      style={{ color: theme.colors.textPrimary, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, borderWidth: 1, borderRadius: 8, minHeight: 44, paddingHorizontal: 12 }} />
  </View>;
}

function SelectField({ label, value, choices, onChange, disabled }: { label: string; value: string; choices: Choice[]; onChange: (value: string) => void; disabled: boolean }) {
  const { theme } = useFanixTheme();
  const [open, setOpen] = useState(false);
  const selected = choices.find(choice => choice.value === value);
  return <View style={{ flex: 1, minWidth: 170, gap: 5 }}>
    <Text style={{ color: theme.colors.textSecondary }}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${selected?.label ?? 'Todos'}`} accessibilityState={{ disabled, expanded: open }} disabled={disabled} onPress={() => setOpen(previous => !previous)}
      style={{ justifyContent: 'center', backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, borderWidth: 1, borderRadius: 8, minHeight: 44, paddingHorizontal: 12 }}>
      <Text style={{ color: theme.colors.textPrimary }}>{selected?.label ?? choices[0]?.label ?? 'Seleccionar'}</Text>
    </Pressable>
    {open && !disabled ? <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, backgroundColor: theme.colors.surface, overflow: 'hidden' }}>
      {choices.map(choice => <Pressable key={`${choice.value}:${choice.label}`} accessibilityRole="button" onPress={() => { onChange(choice.value); setOpen(false); }}
        style={{ minHeight: 42, justifyContent: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider }}>
        <Text style={{ color: theme.colors.textPrimary }}>{choice.label}</Text>
      </Pressable>)}
    </View> : null}
  </View>;
}
