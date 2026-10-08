import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '../components/ui/Card';
import { DataTable } from '../components/ui/Table';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { useFanixTheme } from '../theme/FanixThemeProvider';
import { labels, type Field, type ModuleConfig } from './config';
import { fieldError } from './validation';
import { downloadSalesReportExcel, downloadSalesReportPdf, prepareSalesReport } from '../services/reportExport';

type Row = Record<string, any>;
type Request = (path: string, init?: RequestInit) => Promise<any>;
export function ModuleWorkspace({ config, role, userId, currency, request, onChanged }: { config: ModuleConfig; role: string; userId: string; currency: string; request: Request; onChanged: () => void }) {
  const { theme } = useFanixTheme();
  const [rows, setRows] = useState<Row[]>([]);
  const [choices, setChoices] = useState<Record<string, Row[]>>({});
  const [values, setValues] = useState<Record<string, string>>(() => defaults());
  const [items, setItems] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const mounted = useRef(true);
  const version = useRef(0);
  const mutationLock = useRef(false);
  const idempotencyKey = useRef('');
  const canWrite = !!config.fields && !!config.writeRoles?.includes(role);
  const manager = ['owner', 'admin'].includes(role);
  function defaults() {
    const result: Record<string, string> = {};
    for (const field of config.fields ?? []) {
      if (field.options) result[field.key] = field.options[0];
      if (field.key === 'ownerId') result[field.key] = userId;
      if (field.key === 'taxRate' || field.key === 'stockMinimum') result[field.key] = '0';
    }
    return result;
  }
  function change(key: string, value: string) { setValues(previous => ({ ...previous, [key]: value })); idempotencyKey.current = ''; setSuccess(''); }
  async function load() {
    const sequence = ++version.current;
    setLoading(true); setError('');
    const sources = new Set((config.fields ?? []).flatMap(field => field.source ? [field.source] : []));
    if (config.commercial) sources.add('products');
    // Resolve names for read-only lists as well as form selectors.
    if (config.columns.some(column => column.key === 'productId')) sources.add('products');
    if (config.columns.some(column => column.key === 'customerId')) sources.add('customers');
    if (config.columns.some(column => column.key === 'supplierId')) sources.add('suppliers');
    try {
      const data = await request(config.path);
      const options = await Promise.all([...sources].map(async source => {
        // Viewer roles can list projects without listing company members.
        if (source === 'company/members' && !['owner', 'admin', 'sales'].includes(role)) return [source, []] as const;
        return [source, await request(source)] as const;
      }));
      if (!mounted.current || version.current !== sequence) return;
      setRows(Array.isArray(data) ? data : []);
      setChoices(Object.fromEntries(options));
    } catch (err) {
      if (mounted.current && version.current === sequence) { setRows([]); setError(err instanceof Error ? err.message : 'No se pudo cargar el módulo.'); }
    } finally { if (mounted.current && version.current === sequence) setLoading(false); }
  }
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; version.current++; }; }, []);
  function clearForm() { setValues(defaults()); setItems([]); setEditing(null); setFormOpen(false); idempotencyKey.current = ''; }
  function validated(field: Field) {
    const value = (values[field.key] ?? '').trim();
    const issue = fieldError(field, value);
    if (issue) throw new Error(`${field.label}: ${issue}`);
    if (!value && field.required) throw new Error(`${field.label}: completa este campo.`);
    if (!value) return undefined;
    if (field.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error(`${field.label}: escribe un correo válido.`);
    if (field.maxLength && value.length > field.maxLength) throw new Error(`${field.label}: máximo ${field.maxLength} caracteres.`);
    if (field.source && !(choices[field.source] ?? []).some(row => row.id === value)) throw new Error(`${field.label}: selecciona un registro válido.`);
    if (field.numeric) {
      const number = Number(value.replace(',', '.'));
      if (!Number.isFinite(number) || (field.integer && !Number.isInteger(number)) || (field.min !== undefined && number < field.min) || (field.max !== undefined && number > field.max)) throw new Error(`${field.label}: escribe un número válido${field.min !== undefined ? `, mínimo ${field.min}` : ''}.`);
      return number;
    }
    if (['name', 'title', 'category'].includes(field.key) && value.length < 2) throw new Error(`${field.label}: escribe al menos dos caracteres.`);
    return value;
  }
  async function save() {
    if (mutationLock.current) return;
    setError(''); setSuccess('');
    let payload: Row;
    try {
      payload = Object.fromEntries((config.fields ?? []).map(field => [field.key, validated(field)]).filter(([, value]) => value !== undefined));
      if (config.commercial) {
        if (!items.length) throw new Error('Agrega al menos un producto.');
        payload.items = items.map(({ productId, quantity, unitPrice, unitCost }) => config.commercial === 'purchase' ? { productId, quantity, unitCost } : { productId, quantity, unitPrice });
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Revisa el formulario.'); return; }
    mutationLock.current = true; setBusy(true);
    if (!idempotencyKey.current) idempotencyKey.current = `fanix-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      await request(`${config.path}${editing ? `/${editing}` : ''}`, { method: editing ? 'PATCH' : 'POST', headers: { 'Idempotency-Key': idempotencyKey.current }, body: JSON.stringify(payload) });
      if (!mounted.current) return;
      clearForm(); setSuccess(editing ? 'Registro actualizado.' : 'Registro guardado.');
      await load(); onChanged();
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : 'No se pudo guardar.'); }
    finally { mutationLock.current = false; if (mounted.current) setBusy(false); }
  }
  async function action(path: string, method = 'POST', body?: Row) {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setError(''); setSuccess('');
    try { await request(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) }); if (mounted.current) { setSuccess('Acción completada.'); await load(); onChanged(); } }
    catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : 'No se pudo completar.'); }
    finally { mutationLock.current = false; if (mounted.current) setBusy(false); }
  }
  function actionsFor(row: Row) {
    const actions: { label: string; onPress: () => void }[] = [];
    const add = (label: string, suffix: string, method?: string, body?: Row) => actions.push({ label, onPress: () => void action(`${config.path}/${row.id}/${suffix}`, method, body) });
    if (config.editable && canWrite) actions.push({ label: 'Editar', onPress: () => { setValues(Object.fromEntries((config.fields ?? []).map(field => [field.key, String(row[field.key] ?? '')]))); setEditing(row.id); setFormOpen(true); setError(''); setSuccess(''); } });
    if (manager && ['customers', 'products', 'suppliers'].includes(config.path)) actions.push({ label: 'Eliminar', onPress: () => setPendingDelete(row) });
    if (config.path === 'notifications' && !row.readAt) add('Marcar leída', 'read');
    if (config.path === 'incidents' && manager && row.status === 'open') add('Resolver', 'resolve', 'PATCH');
    if (config.path === 'finance/transactions' && manager && row.status === 'pending') add('Marcar pagado', 'pay');
    if (config.path === 'purchases') {
      if (manager && row.status === 'draft') { add('Aprobar', 'approve'); add('Rechazar', 'reject'); }
      if (['owner', 'admin', 'inventory'].includes(role) && row.status === 'approved') add('Recibir mercancía', 'receive');
    }
    if (config.path === 'projects' && canWrite) {
      if (row.status === 'planned') add('Iniciar', 'status', 'PATCH', { status: 'active' });
      if (row.status === 'active') add('Cerrar proyecto', 'status', 'PATCH', { status: 'closed' });
    }
    if (config.path === 'quotes' && canWrite) {
      if (row.status === 'draft') add('Marcar enviada', 'status', 'PATCH', { status: 'sent' });
      if (row.status === 'sent') { add('Aceptar', 'status', 'PATCH', { status: 'accepted' }); add('Rechazar', 'status', 'PATCH', { status: 'rejected' }); }
    }
    return actions;
  }
  function formatted(row: Row) {
    const result: Row = { ...row };
    const sourceMap: Record<string, string> = { productId: 'products', customerId: 'customers', supplierId: 'suppliers', ownerId: 'company/members', branchId: 'branches' };
    for (const column of config.columns) {
      const value = row[column.key];
      if (value == null || value === '') result[column.key] = column.key === 'readAt' ? 'Sin leer' : '—';
      else if (sourceMap[column.key]) result[column.key] = choices[sourceMap[column.key]]?.find(choice => choice.id === value)?.name ?? (config.label === 'Reportes' && column.key === 'customerId' ? 'Cliente no disponible' : value);
      else if (['amount', 'total', 'price', 'cost'].includes(column.key)) { try { result[column.key] = new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(Number(value)); } catch { result[column.key] = String(value); } }
      else if (['createdAt', 'readAt'].includes(column.key)) result[column.key] = new Date(value).toLocaleString('es-MX');
      else if (typeof value === 'boolean') result[column.key] = value ? 'Sí' : 'No';
      else result[column.key] = labels[value] ?? value;
    }
    return result;
  }
  const filtered = rows.filter(row => config.columns.some(column => String(formatted(row)[column.key] ?? '').toLocaleLowerCase().includes(search.toLocaleLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * 10, currentPage * 10 + 10);
  async function exportReport(format: 'pdf' | 'xlsx') {
    setExporting(true);
    setError('');
    try {
      const reportRows = prepareSalesReport(filtered, choices.customers ?? []);
      if (format === 'pdf') downloadSalesReportPdf(reportRows, currency);
      else downloadSalesReportExcel(reportRows, currency);
    } catch (err) {
      setError(err instanceof Error ? `No se pudo generar o descargar el reporte: ${err.message}` : 'No se pudo generar o descargar el reporte. Vuelve a intentarlo.');
    } finally {
      setExporting(false);
    }
  }
  const button = (label: string, onPress: () => void, disabled = false) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.accentSoft, opacity: disabled ? 0.45 : 1 }}><Text style={{ color: theme.colors.accent, fontWeight: '600' }}>{label}</Text></Pressable>;
  return <Card style={{ padding: 18, gap: 14 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <Text style={{ flexGrow: 1, color: theme.colors.textPrimary, fontWeight: '700', fontSize: 18 }}>{config.label}</Text>
      {button('Actualizar', () => void load(), loading || busy)}
      {config.label === 'Reportes' ? <>
        {button('Exportar PDF', () => void exportReport('pdf'), loading || !!error || !filtered.length || exporting)}
        {button('Exportar Excel', () => void exportReport('xlsx'), loading || !!error || !filtered.length || exporting)}
      </> : null}
      {canWrite && !formOpen ? button('Nuevo registro', () => { clearForm(); setFormOpen(true); }, busy) : null}
    </View>
    {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text> : null}
    {success ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.accent }}>{success}</Text> : null}
    {pendingDelete ? <View style={{ gap: 10 }}><Text style={{ color: theme.colors.danger }}>¿Eliminar {pendingDelete.name}? Esta acción es permanente. Los registros relacionados impedirán la eliminación.</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{button('Confirmar eliminación', () => { void action(`${config.path}/${pendingDelete.id}`, 'DELETE').then(() => setPendingDelete(null)); }, busy)}{button('Cancelar eliminación', () => setPendingDelete(null), busy)}</View></View> : null}
    {config.label === 'Documentos' ? <Text style={{ color: theme.colors.textSecondary }}>Consulta del catálogo de documentos. La carga y descarga de archivos desde esta interfaz sigue pendiente.</Text> : null}
    {formOpen && canWrite ? <View style={{ gap: 12, paddingVertical: 12 }}>
      <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{editing ? 'Editar registro' : 'Nuevo registro'}</Text>
      {(config.fields ?? []).map(field => <FieldInput key={field.key} field={field} value={values[field.key] ?? ''} onChange={value => change(field.key, value)} choices={choices[field.source ?? ''] ?? []} disabled={busy} />)}
      {config.commercial ? <CommercialItems products={choices.products ?? []} items={items} onChange={next => { setItems(next); idempotencyKey.current = ''; }} purchase={config.commercial === 'purchase'} disabled={busy} /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{button(busy ? 'Guardando…' : 'Guardar', () => void save(), busy || loading)}{button('Cancelar', clearForm, busy)}</View>
    </View> : null}
    <TextInput accessibilityLabel={`Buscar en ${config.label}`} placeholder="Buscar en registros…" placeholderTextColor={theme.colors.inputPlaceholder} value={search} onChangeText={value => { setSearch(value); setPage(0); }} style={{ color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.inputBorder, padding: 12, borderRadius: 8, minHeight: 44 }} />
    {loading ? <LoadingState label="Cargando registros…" /> : !visible.length ? <EmptyState title={search ? 'Sin coincidencias' : 'Sin registros'} description={error ? 'Actualiza para volver a intentar.' : search ? 'Prueba otra búsqueda.' : 'Los registros de tu empresa aparecerán aquí.'} /> : <DataTable rows={visible.map(formatted)} columns={config.columns} actions={(_row, index) => actionsFor(visible[index])} disabled={busy} />}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{button('Anterior', () => setPage(currentPage - 1), currentPage === 0 || loading)}<Text style={{ color: theme.colors.textSecondary }}>Página {currentPage + 1} de {pages} · {filtered.length} registros</Text>{button('Siguiente', () => setPage(currentPage + 1), currentPage + 1 >= pages || loading)}</View>
  </Card>;
}

function FieldInput({ field, value, onChange, choices = [], disabled }: { field: Field; value: string; onChange: (value: string) => void; choices?: Row[]; disabled?: boolean }) {
  const { theme } = useFanixTheme();
  const [query, setQuery] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [touched, setTouched] = useState(false);
  const issue = touched ? fieldError(field, value) : '';
  const selected = choices.find(row => row.id === value);
  const options: Row[] = field.options?.map(option => ({ id: option, name: labels[option] ?? option })) ?? choices.filter(row => `${row.name} ${row.sku ?? ''}`.toLowerCase().includes(query.toLowerCase())).slice(0, 20);
  return <View style={{ gap: 6 }}>
    <Text style={{ color: theme.colors.textSecondary }}>{field.label}{field.required ? ' *' : ''}</Text>
    {field.options || field.source ? <>
      {field.source ? <Pressable accessibilityRole="button" disabled={disabled} onPress={() => setSelecting(previous => !previous)} style={{ minHeight: 44, borderWidth: 1, borderColor: theme.colors.border, padding: 12, borderRadius: 8 }}><Text style={{ color: theme.colors.textPrimary }}>{selected?.name ?? 'Seleccionar…'}</Text></Pressable> : null}
      {(!field.source || selecting) ? <>
        {field.source ? <TextInput accessibilityLabel={`Buscar ${field.label}`} value={query} onChangeText={setQuery} placeholder="Buscar…" placeholderTextColor={theme.colors.inputPlaceholder} style={{ color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, padding: 12, borderRadius: 8 }} /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{options.map(option => <Pressable key={option.id} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: value === option.id, disabled }} onPress={() => { onChange(option.id); setSelecting(false); }} style={{ minHeight: 44, padding: 12, borderRadius: 8, backgroundColor: value === option.id ? theme.colors.accentSoft : theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border }}><Text style={{ color: theme.colors.textPrimary }}>{option.name}{option.sku ? ` · ${option.sku}` : ''}</Text></Pressable>)}</View>
        {!options.length ? <Text style={{ color: theme.colors.textSecondary }}>No hay opciones. Primero crea un registro en el módulo correspondiente.</Text> : null}
        {field.source && !field.required ? <Pressable disabled={disabled} accessibilityRole="button" onPress={() => { onChange(''); setSelecting(false); }}><Text style={{ color: theme.colors.accent, padding: 12 }}>Sin asignar</Text></Pressable> : null}
      </> : null}
    </> : <TextInput editable={!disabled} accessibilityLabel={field.label} value={value} onChangeText={onChange} onBlur={() => setTouched(true)} autoCapitalize={field.email || field.key === 'sku' ? 'none' : 'sentences'} autoCorrect={!field.email && field.key !== 'sku'} keyboardType={field.numeric ? 'decimal-pad' : field.email ? 'email-address' : 'default'} multiline={field.key === 'description'} maxLength={field.key === 'phone' ? 20 : field.email ? 254 : field.maxLength} style={{ color: theme.colors.textPrimary, minHeight: 44, borderWidth: 1, borderColor: issue ? theme.colors.danger : theme.colors.inputBorder, borderRadius: 8, padding: 12 }} />}
    {issue ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{issue}</Text> : null}
  </View>;
}
function CommercialItems({ products, items, onChange, purchase, disabled }: { products: Row[]; items: Row[]; onChange: (items: Row[]) => void; purchase: boolean; disabled: boolean }) {
  const { theme } = useFanixTheme();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  function add() {
    const product = products.find(row => row.id === productId);
    const count = Number(quantity);
    const unit = Number(price.replace(',', '.'));
    if (!product || !Number.isInteger(count) || count < 1 || !price.trim() || !Number.isFinite(unit) || unit < 0) { setError('Selecciona un producto, una cantidad entera positiva y un precio válido.'); return; }
    if (items.some(row => row.productId === productId)) { setError('Ese producto ya está agregado. Retíralo para cambiar su cantidad.'); return; }
    onChange([...items, { productId, name: product.name, quantity: count, [purchase ? 'unitCost' : 'unitPrice']: unit }]);
    setProductId(''); setQuantity('1'); setPrice(''); setError('');
  }
  return <View style={{ gap: 10 }}>
    <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>Productos de la operación</Text>
    <FieldInput field={{ key: 'productId', label: 'Producto', source: 'products', required: true }} value={productId} onChange={value => { setProductId(value); const product = products.find(row => row.id === value); setPrice(String(product?.[purchase ? 'cost' : 'price'] ?? '')); }} choices={products} disabled={disabled} />
    <FieldInput field={{ key: 'quantity', label: 'Cantidad', numeric: true }} value={quantity} onChange={setQuantity} disabled={disabled} />
    <FieldInput field={{ key: 'price', label: purchase ? 'Costo unitario' : 'Precio unitario', numeric: true }} value={price} onChange={setPrice} disabled={disabled} />
    <Pressable accessibilityRole="button" disabled={disabled} onPress={add} style={{ minHeight: 44, padding: 12 }}><Text style={{ color: theme.colors.accent }}>Agregar producto</Text></Pressable>
    {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text> : null}
    {items.map(item => <View key={item.productId} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}><Text style={{ color: theme.colors.textPrimary, flex: 1 }}>{item.name} · {item.quantity} × {item.unitPrice ?? item.unitCost}</Text><Pressable accessibilityRole="button" disabled={disabled} onPress={() => onChange(items.filter(row => row.productId !== item.productId))} style={{ padding: 12, minHeight: 44 }}><Text style={{ color: theme.colors.danger }}>Quitar</Text></Pressable></View>)}
    <Text style={{ color: theme.colors.textPrimary }}>Subtotal: {items.reduce((sum, item) => sum + item.quantity * (item.unitPrice ?? item.unitCost), 0).toFixed(2)}</Text>
  </View>;
}
