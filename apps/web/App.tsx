import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FanixLogo } from './src/components/branding/FanixLogo';
import { AppShell } from './src/components/layout/AppShell';
import { Badge } from './src/components/ui/Badge';
import { Card } from './src/components/ui/Card';
import { EmptyState } from './src/components/ui/EmptyState';
import { LoadingState } from './src/components/ui/LoadingState';
import { StatCard } from './src/components/ui/StatCard';
import { DataTable } from './src/components/ui/Table';
import { API, endpointMap, type Dashboard, type Resource } from './src/services/api';
import fanixTheme from './src/theme/fanixTheme';

const moduleItems = [
  { label: 'Dashboard', value: 'Dashboard' },
  { label: 'Clientes', value: 'Clientes' },
  { label: 'Productos', value: 'Productos' },
  { label: 'Proveedores', value: 'Proveedores' },
  { label: 'Empleados', value: 'Empleados' },
  { label: 'Proyectos', value: 'Proyectos' },
  { label: 'Finanzas', value: 'Finanzas' },
  { label: 'Incidencias', value: 'Incidencias' },
  { label: 'Notificaciones', value: 'Notificaciones' },
];

const tableColumnsByModule: Record<string, { key: string; label: string }[]> = {
  Dashboard: [
    { key: 'label', label: 'Indicador' },
    { key: 'value', label: 'Valor' },
  ],
  Clientes: [
    { key: 'name', label: 'Cliente' },
    { key: 'email', label: 'Correo' },
    { key: 'status', label: 'Estado' },
  ],
  Productos: [
    { key: 'name', label: 'Producto' },
    { key: 'sku', label: 'SKU' },
    { key: 'stock', label: 'Stock' },
  ],
  Proveedores: [
    { key: 'name', label: 'Proveedor' },
    { key: 'email', label: 'Correo' },
    { key: 'phone', label: 'Teléfono' },
  ],
  Empleados: [
    { key: 'name', label: 'Nombre' },
    { key: 'department', label: 'Departamento' },
    { key: 'status', label: 'Estado' },
  ],
  Proyectos: [
    { key: 'name', label: 'Proyecto' },
    { key: 'status', label: 'Estado' },
    { key: 'ownerId', label: 'Responsable' },
  ],
  Finanzas: [
    { key: 'category', label: 'Categoría' },
    { key: 'amount', label: 'Monto' },
    { key: 'status', label: 'Estado' },
  ],
  Incidencias: [
    { key: 'title', label: 'Incidencia' },
    { key: 'status', label: 'Estado' },
    { key: 'createdAt', label: 'Fecha' },
  ],
  Notificaciones: [
    { key: 'message', label: 'Mensaje' },
    { key: 'status', label: 'Estado' },
  ],
};

export default function App() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('admin@demo.local');
  const [password, setPassword] = useState('Admin123!');
  const [showPassword, setShowPassword] = useState(false);
  const [active, setActive] = useState('Dashboard');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [rows, setRows] = useState<Resource[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingModule, setLoadingModule] = useState(false);
  const [formValue, setFormValue] = useState('');
  const [companyName, setCompanyName] = useState('EMPRESA DEMO');

  const tableColumns = useMemo(() => tableColumnsByModule[active] ?? tableColumnsByModule.Productos, [active]);

  async function login() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? 'No se pudo iniciar sesión');
      setCompanyName(data.company?.name ?? 'EMPRESA DEMO');
      setToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function loadModule(module: string) {
    setActive(module);
    if (module === 'Dashboard' || !token) return;
    setLoadingModule(true);
    setError('');
    const path = endpointMap[module];
    if (!path) {
      setLoadingModule(false);
      return;
    }

    try {
      const response = await fetch(`${API}/${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? 'No se pudo cargar el módulo');
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar');
      setRows([]);
    } finally {
      setLoadingModule(false);
    }
  }

  async function createRecord() {
    const path = endpointMap[active];
    if (!path || !formValue.trim()) return;
    setBusy(true);
    setError('');

    const payload =
      active === 'Finanzas'
        ? { type: 'income', category: formValue, amount: 1, status: 'pending' }
        : active === 'Incidencias'
          ? { title: formValue }
          : active === 'Productos'
            ? { sku: `SKU-${Date.now()}`, name: formValue, price: 0, cost: 0, stockMinimum: 1 }
            : active === 'Proyectos'
              ? { name: formValue, ownerId: '00000000-0000-0000-0000-000000000000' }
              : { name: formValue };

    try {
      const response = await fetch(`${API}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? 'No se pudo crear el registro');
      setFormValue('');
      await loadModule(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el registro');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => setDashboard(data))
      .catch(() => setError('No se pudo cargar el dashboard'));
  }, [token]);

  useEffect(() => {
    if (token && active !== 'Dashboard') {
      loadModule(active);
    }
  }, [token, active]);

  const stats = [
    { label: 'Clientes', value: dashboard?.counts.customers ?? 0, delta: '+12%' },
    { label: 'Productos', value: dashboard?.counts.products ?? 0, delta: '+4%' },
    { label: 'Ventas', value: dashboard?.counts.sales ?? 0, delta: '+8%' },
    { label: 'Notificaciones', value: dashboard?.counts.unreadNotifications ?? 0, delta: '3 pendientes' },
  ];

  const inventoryAlerts = dashboard?.lowStock ?? [];
  const recentActivity = dashboard?.recentActivity ?? [];

  if (!token) {
    return (
      <SafeAreaView style={styles.loginPage}>
        <View style={styles.loginGradient} />
        <View style={styles.loginCard}>
          <View style={styles.brandHeader}>
            <FanixLogo />
          </View>

          <Text style={styles.title}>Acceso seguro</Text>
          <Text style={styles.subtitle}>Gestiona operaciones, finanzas y rendimiento con Fanix Global.</Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            placeholderTextColor={fanixTheme.colors.textMuted}
            style={styles.input}
          />

          <View style={styles.passwordWrap}>
            <TextInput
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor={fanixTheme.colors.textMuted}
              style={styles.passwordInput}
            />
            <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.toggleButton}>
              <Text style={styles.toggleText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
            </Pressable>
          </View>

          <Pressable onPress={login} disabled={busy} style={[styles.primaryButton, busy && styles.primaryButtonDisabled]}>
            <Text style={styles.primaryButtonText}>{busy ? 'Iniciando sesión...' : 'Iniciar sesión'}</Text>
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.hintRow}>
            <Badge label="Demo" variant="info" />
            <Text style={styles.hintText}>admin@demo.local / Admin123!</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AppShell
      title={active}
      subtitle={companyName}
      navItems={moduleItems}
      activeItem={active}
      onSelect={loadModule}
      onLogout={() => { setToken(''); setError(''); setRows([]); setDashboard(null); }}
    >
      {error ? <Card style={styles.notice}><Text style={styles.noticeText}>{error}</Text></Card> : null}

      {active === 'Dashboard' ? (
        <>
          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} delta={stat.delta} />
            ))}
          </View>

          <View style={styles.twoColumn}>
            <Card style={styles.cardSection}>
              <Text style={styles.sectionTitle}>Alertas de inventario</Text>
              {inventoryAlerts.length ? (
                inventoryAlerts.map((item) => (
                  <View key={item.product.name} style={styles.listRow}>
                    <View>
                      <Text style={styles.listTitle}>{item.product.name}</Text>
                      <Text style={styles.listMeta}>{item.stock} unidades disponibles</Text>
                    </View>
                    <Badge label={item.stock <= 0 ? 'Sin stock' : 'Bajo mínimo'} variant={item.stock <= 0 ? 'danger' : 'warning'} />
                  </View>
                ))
              ) : (
                <EmptyState title="Sin alertas de stock" description="El inventario está dentro del rango esperado." />
              )}
            </Card>

            <Card style={styles.cardSection}>
              <Text style={styles.sectionTitle}>Actividad reciente</Text>
              {recentActivity.length ? (
                recentActivity.map((item, index) => (
                  <View key={`${item.entity}-${index}`} style={styles.activityItem}>
                    <View style={styles.dot} />
                    <View style={styles.activityTextWrap}>
                      <Text style={styles.activityTitle}>{item.entity}</Text>
                      <Text style={styles.activityMeta}>{item.action}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <EmptyState title="Sin actividad" description="Todavía no hay eventos recientes para esta empresa." />
              )}
            </Card>
          </View>
        </>
      ) : (
        <Card style={styles.cardSection}>
          <View style={styles.moduleHeader}>
            <Text style={styles.sectionTitle}>{active}</Text>
            <View style={styles.inlineCreate}>
              <TextInput
                value={formValue}
                onChangeText={setFormValue}
                placeholder={`Nuevo ${active.toLowerCase()}`}
                placeholderTextColor={fanixTheme.colors.textMuted}
                style={styles.formInput}
              />
              <Pressable onPress={createRecord} disabled={busy || !formValue.trim()} style={[styles.secondaryButton, (busy || !formValue.trim()) && styles.primaryButtonDisabled]}>
                <Text style={styles.secondaryButtonText}>{busy ? 'Guardando...' : 'Crear'}</Text>
              </Pressable>
            </View>
          </View>

          {loadingModule ? <LoadingState label="Cargando módulo..." /> : null}

          {!loadingModule && (!rows || rows.length === 0) ? (
            <EmptyState title="Sin registros" description={`No hay información disponible en ${active.toLowerCase()} en este momento.`} />
          ) : null}

          {!loadingModule && rows.length > 0 ? <DataTable rows={rows as Record<string, string | number | null | undefined>[]} columns={tableColumns} /> : null}
        </Card>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  loginPage: {
    flex: 1,
    backgroundColor: fanixTheme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loginGradient: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#EAF2FF',
  },
  loginCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: fanixTheme.colors.surface,
    borderRadius: fanixTheme.radius.xl,
    borderWidth: 1,
    borderColor: fanixTheme.colors.border,
    padding: 30,
    zIndex: 1,
    ...fanixTheme.shadows.md,
  },
  brandHeader: { marginBottom: 18 },
  title: { color: fanixTheme.colors.textPrimary, fontSize: 34, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: fanixTheme.colors.textSecondary, fontSize: 15, marginBottom: 24, lineHeight: 22 },
  input: {
    backgroundColor: fanixTheme.colors.surface,
    borderWidth: 1,
    borderColor: fanixTheme.colors.border,
    borderRadius: fanixTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    color: fanixTheme.colors.textPrimary,
    fontSize: 15,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: fanixTheme.colors.surface,
    borderWidth: 1,
    borderColor: fanixTheme.colors.border,
    borderRadius: fanixTheme.radius.md,
    marginBottom: 18,
    overflow: 'hidden',
  },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, color: fanixTheme.colors.textPrimary, fontSize: 15 },
  toggleButton: { paddingHorizontal: 12, paddingVertical: 12 },
  toggleText: { color: fanixTheme.colors.primary, fontWeight: '700' },
  primaryButton: {
    backgroundColor: fanixTheme.colors.primary,
    borderRadius: fanixTheme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: fanixTheme.colors.white, fontSize: 15, fontWeight: '700' },
  errorText: { marginTop: 14, color: fanixTheme.colors.danger, fontWeight: '600' },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  hintText: { color: fanixTheme.colors.textSecondary, fontSize: 12 },
  notice: { backgroundColor: '#FFF4F4', borderColor: '#F7C7C7', borderWidth: 1, padding: 12 },
  noticeText: { color: fanixTheme.colors.danger, fontWeight: '700' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  twoColumn: { flexDirection: 'row', gap: 18 },
  cardSection: { flex: 1, padding: 18 },
  sectionTitle: { color: fanixTheme.colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 14 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: fanixTheme.colors.border },
  listTitle: { color: fanixTheme.colors.textPrimary, fontWeight: '700' },
  listMeta: { color: fanixTheme.colors.textSecondary, fontSize: 12, marginTop: 4 },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  dot: { width: 10, height: 10, borderRadius: 99, backgroundColor: fanixTheme.colors.primary },
  activityTextWrap: { flex: 1 },
  activityTitle: { color: fanixTheme.colors.textPrimary, fontWeight: '700' },
  activityMeta: { color: fanixTheme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  moduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  inlineCreate: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  formInput: {
    backgroundColor: fanixTheme.colors.surfaceSecondary,
    borderColor: fanixTheme.colors.border,
    borderWidth: 1,
    borderRadius: fanixTheme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 180,
    color: fanixTheme.colors.textPrimary,
  },
  secondaryButton: {
    backgroundColor: fanixTheme.colors.primaryLight,
    borderRadius: fanixTheme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: { color: fanixTheme.colors.primaryDark, fontWeight: '700' },
});
