import React, { useEffect, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { FanixLogo } from './src/components/branding/FanixLogo';
import { AppShell } from './src/components/layout/AppShell';
import { Badge } from './src/components/ui/Badge';
import { Card } from './src/components/ui/Card';
import { EmptyState } from './src/components/ui/EmptyState';
import { LoadingState } from './src/components/ui/LoadingState';
import { StatCard } from './src/components/ui/StatCard';
import { DataTable } from './src/components/ui/Table';
import { API, authenticatedRequest, clearTokens, endpointMap, loadTokens, loginRequest, logoutRequest, refreshSession, saveTokens, type Dashboard, type PublicUser, type Resource } from './src/services/api';
import { FanixThemeProvider, useFanixTheme } from './src/theme/FanixThemeProvider';
import type { FanixTheme } from './src/theme/fanixTheme';

const moduleItems = [
  { label: 'Inicio', value: 'Dashboard', group: 'General' },
  { label: 'Productos', value: 'Productos', group: 'Operaciones' },
  { label: 'Proyectos', value: 'Proyectos', group: 'Operaciones' },
  { label: 'Clientes', value: 'Clientes', group: 'Contactos' },
  { label: 'Proveedores', value: 'Proveedores', group: 'Contactos' },
  { label: 'Finanzas', value: 'Finanzas', group: 'Administración' },
  { label: 'Empleados', value: 'Empleados', group: 'Administración' },
  { label: 'Incidencias', value: 'Incidencias', group: 'Sistema' },
  { label: 'Notificaciones', value: 'Notificaciones', group: 'Sistema' },
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
  return (
    <FanixThemeProvider>
      <ERPApp />
    </FanixThemeProvider>
  );
}

function ERPApp() {
  const { theme, isDark } = useFanixTheme();
  const styles = createStyles(theme);
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const [focusedField, setFocusedField] = useState('');
  const [loginHovered, setLoginHovered] = useState(false);
  const [token, setToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [restoringSession, setRestoringSession] = useState(true);
  const defaultDemoEmail = __DEV__ ? 'admin@demo.local' : '';
  const defaultDemoPassword = __DEV__ ? 'Admin123!' : '';
  const [email, setEmail] = useState(defaultDemoEmail);
  const [password, setPassword] = useState(defaultDemoPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [active, setActive] = useState('Dashboard');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [rows, setRows] = useState<Resource[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingModule, setLoadingModule] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('viewer');

  const tableColumns = useMemo(() => tableColumnsByModule[active] ?? tableColumnsByModule.Productos, [active]);

  async function establishSession(nextToken: string, nextRefreshToken: string) {
    const profile = await authenticatedRequest('me', nextToken);
    setToken(nextToken);
    setRefreshToken(nextRefreshToken);
    setUser(profile.user ?? null);
    setCompanyName(profile.company?.name ?? '');
    setRole(profile.role ?? 'viewer');
  }

  async function requestWithSession(path: string, init: RequestInit = {}) {
    try {
      return await authenticatedRequest(path, token, init);
    } catch (err) {
      const apiError = err as Error & { status?: number };
      if (apiError.status !== 401 || !refreshToken) throw err;
      const renewed = await refreshSession(refreshToken);
      await saveTokens(renewed.token, renewed.refreshToken);
      await establishSession(renewed.token, renewed.refreshToken);
      return authenticatedRequest(path, renewed.token, init);
    }
  }

  async function login() {
    setBusy(true);
    setError('');
    try {
      const data = await loginRequest(email, password);
      await saveTokens(data.token, data.refreshToken);
      await establishSession(data.token, data.refreshToken);
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
      const data = await requestWithSession(path);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar');
      setRows([]);
    } finally {
      setLoadingModule(false);
    }
  }

  const formFields: Record<string, Array<{ key: string; label: string; type?: 'number' | 'email' }>> = {
    Clientes: [{ key: 'name', label: 'Nombre' }, { key: 'email', label: 'Correo', type: 'email' }, { key: 'phone', label: 'Teléfono' }, { key: 'classification', label: 'Clasificación' }],
    Productos: [{ key: 'name', label: 'Nombre' }, { key: 'sku', label: 'SKU' }, { key: 'price', label: 'Precio', type: 'number' }, { key: 'cost', label: 'Costo', type: 'number' }, { key: 'stockMinimum', label: 'Stock mínimo', type: 'number' }],
    Proveedores: [{ key: 'name', label: 'Nombre' }, { key: 'email', label: 'Correo', type: 'email' }, { key: 'phone', label: 'Teléfono' }],
    Empleados: [{ key: 'name', label: 'Nombre' }, { key: 'email', label: 'Correo', type: 'email' }, { key: 'department', label: 'Departamento' }, { key: 'position', label: 'Puesto' }],
    Finanzas: [{ key: 'category', label: 'Categoría' }, { key: 'amount', label: 'Monto', type: 'number' }, { key: 'reference', label: 'Referencia' }],
    Incidencias: [{ key: 'title', label: 'Título' }, { key: 'description', label: 'Descripción' }],
  };

  const fieldLimits: Record<string, number> = { name: 120, email: 254, phone: 20, classification: 40, sku: 40, price: 12, cost: 12, stockMinimum: 9, department: 80, position: 80, category: 80, amount: 12, reference: 120, title: 160, description: 2000 };

  function sanitizeField(key: string, raw: string) {
    const limit = fieldLimits[key] ?? 160;
    let value = raw.slice(0, limit);
    if (['price', 'cost', 'amount'].includes(key)) value = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    else if (key === 'stockMinimum') value = value.replace(/\D/g, '');
    else if (key === 'phone') value = value.replace(/[^0-9+ ()-]/g, '');
    else if (key === 'sku') value = value.replace(/[^A-Za-z0-9._-]/g, '');
    else if (['name', 'classification', 'department', 'position', 'category', 'reference', 'title'].includes(key)) value = value.replace(/[^\p{L}\p{M}0-9 .,'&()_\-/#]/gu, '');
    return value;
  }

  function validateField(key: string, value: string) {
    const clean = value.trim();
    if (!clean) return '';
    if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return 'Ingresa un correo válido.';
    if (key === 'phone' && !/^\+?[0-9 ()-]{7,20}$/.test(clean)) return 'Usa entre 7 y 20 caracteres de teléfono.';
    if (key === 'sku' && !/^[A-Za-z0-9._-]+$/.test(clean)) return 'Solo letras, números, punto, guion y guion bajo.';
    if (['price', 'cost'].includes(key) && (!/^\d+(\.\d{1,2})?$/.test(clean) || Number(clean) < 0)) return 'Ingresa un número positivo con máximo 2 decimales.';
    if (key === 'amount' && (!/^\d+(\.\d{1,2})?$/.test(clean) || Number(clean) <= 0)) return 'El monto debe ser mayor que 0 y tener máximo 2 decimales.';
    if (key === 'stockMinimum' && (!/^\d+$/.test(clean) || Number(clean) < 0)) return 'El stock debe ser un entero igual o mayor que 0.';
    if (['name', 'title', 'category'].includes(key) && clean.length < 2) return 'Ingresa al menos 2 caracteres.';
    return '';
  }

  function updateFormField(key: string, raw: string) {
    const value = sanitizeField(key, raw);
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: validateField(key, value) }));
  }

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term)));
  }, [rows, search]);

  function buildPayload() {
    const value = (key: string) => form[key]?.trim() ?? '';
    if (active === 'Productos') return { name: value('name'), sku: value('sku'), price: Number(value('price')), cost: Number(value('cost')), stockMinimum: Number(value('stockMinimum') || 0) };
    if (active === 'Clientes') return { name: value('name'), ...(value('email') ? { email: value('email') } : {}), ...(value('phone') ? { phone: value('phone') } : {}), ...(value('classification') ? { classification: value('classification') } : {}) };
    if (active === 'Proveedores') return { name: value('name'), ...(value('email') ? { email: value('email') } : {}), ...(value('phone') ? { phone: value('phone') } : {}) };
    if (active === 'Empleados') return { name: value('name'), ...(value('email') ? { email: value('email') } : {}), ...(value('department') ? { department: value('department') } : {}), ...(value('position') ? { position: value('position') } : {}), status: 'active' };
    if (active === 'Finanzas') return { type: 'income', category: value('category'), amount: Number(value('amount')), status: 'pending', ...(value('reference') ? { reference: value('reference') } : {}) };
    if (active === 'Incidencias') return { title: value('title'), ...(value('description') ? { description: value('description') } : {}) };
    return null;
  }

  function startEdit(row: Record<string, unknown>) {
    if (!row.id) return;
    setEditingId(String(row.id));
    setFieldErrors({});
    const next: Record<string, string> = {};
    (formFields[active] ?? []).forEach((field) => { next[field.key] = String(row[field.key] ?? ''); });
    setForm(next);
  }

  async function saveRecord() {
    const path = endpointMap[active];
    const payload = buildPayload();
    if (!path || !payload) return;
    const required = active === 'Productos' ? ['name', 'sku', 'price', 'cost'] : active === 'Finanzas' ? ['category', 'amount'] : [active === 'Incidencias' ? 'title' : 'name'];
    if (required.some((key) => !form[key]?.trim())) { setError('Completa los campos obligatorios.'); return; }
    const errors = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, validateField(key, value)]).filter(([, message]) => message));
    if (Object.keys(errors).length) { setFieldErrors(errors); setError('Corrige los campos marcados antes de guardar.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${API}/${path}${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? 'No se pudo guardar el registro');
      setForm({}); setFieldErrors({}); setEditingId(null); setSuccess(editingId ? 'Registro actualizado correctamente.' : 'Registro creado correctamente.');
      await loadModule(active);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el registro'); } finally { setBusy(false); }
  }

  async function deleteRecord(row: Record<string, unknown>) {
    const path = endpointMap[active]; if (!path || !row.id) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${API}/${path}/${row.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? 'No se pudo eliminar el registro');
      setSuccess('Registro eliminado correctamente.'); await loadModule(active);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo eliminar el registro'); } finally { setBusy(false); }
  }

  async function runContextAction(row: Record<string, unknown>) {
    if (!row.id) return;
    const actionPath = active === 'Incidencias'
      ? `incidents/${row.id}/resolve`
      : active === 'Notificaciones'
        ? `notifications/${row.id}/read`
        : active === 'Finanzas'
          ? `finance/transactions/${row.id}/pay`
          : '';
    if (!actionPath) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${API}/${actionPath}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? 'No se pudo completar la acción');
      setSuccess(active === 'Incidencias' ? 'Incidencia resuelta.' : active === 'Notificaciones' ? 'Notificación marcada como leída.' : 'Movimiento marcado como pagado.');
      await loadModule(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción');
    } finally { setBusy(false); }
  }

  async function logout() {
    try { if (token) await logoutRequest(token); } catch {}
    await clearTokens();
    setToken(''); setRefreshToken(''); setUser(null); setRole('viewer');
    setError(''); setSuccess(''); setRows([]); setDashboard(null); setActive('Dashboard');
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await loadTokens();
        if (!stored.refreshToken) return;
        const renewed = await refreshSession(stored.refreshToken);
        if (!mounted) return;
        await saveTokens(renewed.token, renewed.refreshToken);
        await establishSession(renewed.token, renewed.refreshToken);
      } catch { await clearTokens(); }
      finally { if (mounted) setRestoringSession(false); }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!token) return;
    requestWithSession('dashboard').then(setDashboard).catch(() => setError('No se pudo cargar el dashboard'));
  }, [token]);

  useEffect(() => {
    if (token && active !== 'Dashboard') {
      loadModule(active);
    }
  }, [token, active]);

  const stats = [
    { label: 'Clientes', value: dashboard?.counts.customers ?? 0, delta: undefined },
    { label: 'Productos', value: dashboard?.counts.products ?? 0, delta: undefined },
    { label: 'Ventas', value: dashboard?.counts.sales ?? 0, delta: undefined },
    { label: 'Notificaciones', value: dashboard?.counts.unreadNotifications ?? 0, delta: undefined },
  ];

  const canManage = ['owner', 'admin'].includes(role);
  const canCreate = canManage || (role === 'sales' && ['Clientes', 'Proyectos', 'Incidencias'].includes(active)) || (role === 'inventory' && active === 'Productos') || active === 'Incidencias';

  const inventoryAlerts = dashboard?.lowStock ?? [];
  const recentActivity = dashboard?.recentActivity ?? [];

  if (restoringSession) return <SafeAreaView style={styles.loginPage}><LoadingState label="Restaurando sesión..." /></SafeAreaView>;

  if (!token) {
    return (
      <SafeAreaView style={styles.loginPage}>
        <View style={[StyleSheet.absoluteFillObject, styles.ambientLayers]}>
          {isDark ? (
            <LinearGradient
              colors={theme.colors.loginGradient}
              locations={[0, 0.25, 0.6, 1]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.ambientTopRight}
            />
          ) : (
            <LinearGradient colors={theme.colors.loginGradient} style={StyleSheet.absoluteFillObject} />
          )}
        </View>
        <View style={styles.loginCard}>
          <View style={styles.brandHeader}>
            <FanixLogo compact={width < 420} size="login" variant={isDark ? 'inverse' : 'default'} />
          </View>

          <Text style={styles.title}>Acceso seguro</Text>
          <Text style={styles.subtitle}>Gestiona operaciones, finanzas y rendimiento con Fanix Global.</Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            accessibilityLabel="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField('')}
            placeholderTextColor={theme.colors.inputPlaceholder}
            style={[styles.input, focusedField === 'email' && styles.inputFocused]}
          />

          <View style={[styles.passwordWrap, focusedField === 'password' && styles.inputFocused]}>
            <TextInput
              secureTextEntry={!showPassword}
              accessibilityLabel="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField('')}
              placeholderTextColor={theme.colors.inputPlaceholder}
              style={styles.passwordInput}
            />
            <Pressable onPress={() => setShowPassword((value) => !value)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} style={styles.toggleButton}>
              <Text style={styles.toggleText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={login}
            onFocus={() => setFocusedField('login')}
            onBlur={() => setFocusedField('')}
            onHoverIn={() => setLoginHovered(true)}
            onHoverOut={() => setLoginHovered(false)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            style={({ pressed }) => [styles.primaryButton, loginHovered && !busy && styles.primaryButtonHovered, focusedField === 'login' && styles.buttonFocused, pressed && styles.buttonPressed, busy && styles.primaryButtonDisabled]}
          >
            <Text style={[styles.primaryButtonText, busy && { color: theme.colors.disabledText }]}>{busy ? 'Iniciando sesión...' : 'Iniciar sesión'}</Text>
          </Pressable>

          {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}

          {__DEV__ ? (
            <View style={styles.hintRow}>
              <Badge label="Demo" variant="info" />
              <Text style={styles.hintText}>admin@demo.local / Admin123!</Text>
            </View>
          ) : null}
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
      userLabel={user?.name ? `${user.name} · ${role}` : role}
      onLogout={logout}
    >
      {error ? <Card style={styles.notice}><Text accessibilityRole="alert" style={styles.noticeText}>{error}</Text></Card> : null}
      {success ? <Card style={styles.successNotice}><Text accessibilityRole="alert" style={styles.successText}>{success}</Text></Card> : null}

      {active === 'Dashboard' ? (
        <>
          <View style={styles.dashboardIntro}>
            <View style={styles.dashboardIntroText}>
              <Text style={styles.dashboardTitle}>Resumen general</Text>
              <Text style={styles.dashboardSubtitle}>Consulta el estado de la operación y accede rápidamente a las tareas más frecuentes.</Text>
            </View>
            <View style={styles.quickActions}>
              {[
                { label: '+ Producto', module: 'Productos' },
                { label: '+ Cliente', module: 'Clientes' },
                { label: 'Ver finanzas', module: 'Finanzas' },
              ].map((action) => (
                <Pressable key={action.module} onPress={() => loadModule(action.module)} accessibilityRole="button" style={({ pressed }) => [styles.quickActionButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.quickActionText}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} delta={stat.delta ?? undefined} />
            ))}
          </View>

          <View style={[styles.twoColumn, compact && styles.twoColumnCompact]}>
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
          <View style={[styles.moduleHeader, compact && styles.moduleHeaderCompact]}>
            <View>
              <Text style={styles.sectionTitle}>{active}</Text>
              <Text style={styles.moduleSubtitle}>Gestiona, consulta y actualiza la información de este módulo.</Text>
            </View>
            <TextInput value={search} onChangeText={setSearch} placeholder="Buscar registros..." accessibilityLabel="Buscar registros" placeholderTextColor={theme.colors.inputPlaceholder} style={styles.searchInput} />
          </View>

          {formFields[active] && canCreate ? (
            <View style={styles.formPanel}>
              <Text style={styles.formTitle}>{editingId ? 'Editar registro' : 'Nuevo registro'}</Text>
              <View style={styles.formGrid}>
                {formFields[active].map((field) => (
                  <View key={field.key} style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>{field.label}{['name','sku','price','cost','category','amount','title'].includes(field.key) ? ' *' : ''}</Text>
                    <TextInput
                      value={form[field.key] ?? ''}
                      onChangeText={(value) => updateFormField(field.key, value)}
                      onBlur={() => setFieldErrors((current) => ({ ...current, [field.key]: validateField(field.key, form[field.key] ?? '') }))}
                      maxLength={fieldLimits[field.key] ?? 160}
                      keyboardType={field.type === 'number' ? 'numeric' : field.type === 'email' ? 'email-address' : 'default'}
                      autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
                      placeholder={field.label}
                      placeholderTextColor={theme.colors.inputPlaceholder}
                      style={[styles.formInput, fieldErrors[field.key] ? styles.formInputError : null]}
                    />
                    {fieldErrors[field.key] ? <Text accessibilityRole="alert" style={styles.fieldError}>{fieldErrors[field.key]}</Text> : null}
                  </View>
                ))}
              </View>
              <View style={styles.formActions}>
                {editingId ? <Pressable onPress={() => { setEditingId(null); setForm({}); setFieldErrors({}); }} style={styles.cancelButton}><Text style={styles.cancelButtonText}>Cancelar</Text></Pressable> : null}
                <Pressable onPress={saveRecord} disabled={busy} style={[styles.secondaryButton, busy && styles.primaryButtonDisabled]}><Text style={styles.secondaryButtonText}>{busy ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear registro'}</Text></Pressable>
              </View>
            </View>
          ) : (
            <Text style={styles.moduleSubtitle}>{formFields[active] ? 'Tu rol actual tiene acceso de consulta, pero no permite crear registros en este módulo.' : 'Este módulo utiliza un flujo especializado y no admite creación genérica desde esta pantalla.'}</Text>
          )}

          {loadingModule ? <LoadingState label="Cargando módulo..." /> : null}

          {!loadingModule && (!visibleRows || visibleRows.length === 0) ? (
            <EmptyState title="Sin registros" description={`No hay información disponible en ${active.toLowerCase()} en este momento.`} />
          ) : null}

          {!loadingModule && visibleRows.length > 0 ? <DataTable rows={visibleRows as Record<string, unknown>[]} columns={tableColumns} onEdit={canCreate && ['Clientes','Productos','Proveedores','Empleados'].includes(active) ? startEdit : undefined} onDelete={canManage && ['Clientes','Productos','Proveedores'].includes(active) ? deleteRecord : undefined} onAction={((active === 'Incidencias' && canManage) || active === 'Notificaciones' || (active === 'Finanzas' && canManage)) ? runContextAction : undefined} actionLabel={active === 'Incidencias' ? 'Resolver' : active === 'Notificaciones' ? 'Leída' : active === 'Finanzas' ? 'Pagar' : 'Acción'} /> : null}
        </Card>
      )}
    </AppShell>
  );
}

function createStyles(theme: FanixTheme) {
  return StyleSheet.create({
  loginPage: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  ambientLayers: { pointerEvents: 'none' },
  ambientTopRight: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  ambientBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '50%',
    height: '45%',
    pointerEvents: 'none',
  },
  loginCard: {
    width: '92%',
    maxWidth: 460,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 28,
    zIndex: 1,
    ...theme.shadows.md,
  },
  brandHeader: { marginBottom: 16, alignItems: 'center' },
  title: { color: theme.colors.textPrimary, fontSize: 29, lineHeight: 36, fontWeight: '700', marginBottom: 7 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 14, marginBottom: 22, lineHeight: 21 },
  input: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 48,
    marginBottom: 14,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.md,
    minHeight: 48,
    marginBottom: 18,
    overflow: 'hidden',
  },
  passwordInput: { flex: 1, minWidth: 0, paddingHorizontal: 14, paddingVertical: 12, color: theme.colors.textPrimary, fontSize: 15 },
  toggleButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  toggleText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '500' },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    minHeight: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonHovered: { backgroundColor: theme.colors.primaryHover, borderColor: theme.colors.primaryHover, shadowColor: theme.colors.accent, shadowOpacity: 0.14, shadowRadius: 8, elevation: 2 },
  primaryButtonDisabled: { backgroundColor: theme.colors.disabledSurface, borderColor: theme.colors.border },
  primaryButtonText: { color: theme.colors.textInverse, fontSize: 15, fontWeight: '700' },
  buttonFocused: { borderWidth: 2, borderColor: theme.colors.accentBright, shadowColor: theme.colors.accent, shadowOpacity: 0.16, shadowRadius: 8, elevation: 2 },
  buttonPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  errorText: { marginTop: 14, color: theme.colors.danger, fontWeight: '600', lineHeight: 20 },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  hintText: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
  notice: { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.dangerBorder, borderWidth: 1, padding: 13 },
  noticeText: { color: theme.colors.danger, fontWeight: '600', lineHeight: 20 },
  successNotice: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.infoBorder, borderWidth: 1, padding: 13 },
  successText: { color: theme.colors.accent, fontWeight: '600', lineHeight: 20 },
  dashboardIntro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  dashboardIntroText: { flex: 1, minWidth: 240 },
  dashboardTitle: { color: theme.colors.textPrimary, fontSize: 22, lineHeight: 29, fontWeight: '700' },
  dashboardSubtitle: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4, maxWidth: 620 },
  quickActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  quickActionButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 13, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.infoBorder, backgroundColor: theme.colors.accentSoft },
  quickActionText: { color: theme.colors.accent, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  twoColumn: { flexDirection: 'row', gap: 18 },
  twoColumnCompact: { flexDirection: 'column' },
  cardSection: { flex: 1, padding: 20 },
  sectionTitle: { color: theme.colors.textPrimary, fontSize: 17, lineHeight: 24, fontWeight: '700', marginBottom: 14 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  listTitle: { color: theme.colors.textPrimary, fontWeight: '600', lineHeight: 20 },
  listMeta: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 4 },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  dot: { width: 8, height: 8, borderRadius: 99, backgroundColor: theme.colors.accent },
  activityTextWrap: { flex: 1 },
  activityTitle: { color: theme.colors.textPrimary, fontWeight: '600', lineHeight: 20 },
  activityMeta: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2 },
  moduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  moduleHeaderCompact: { alignItems: 'flex-start' },
  moduleSubtitle: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: -8 },
  searchInput: { minWidth: 220, minHeight: 42, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 12, color: theme.colors.textPrimary },
  formPanel: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.md, padding: 16, marginBottom: 18 },
  formTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 12 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fieldWrap: { minWidth: 180, flexGrow: 1, flexBasis: 180 },
  fieldLabel: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 5 },
  fieldError: { color: theme.colors.danger, fontSize: 11, lineHeight: 16, marginTop: 4 },
  formInputError: { borderColor: theme.colors.danger, borderWidth: 1.5 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  cancelButton: { minHeight: 42, paddingHorizontal: 14, justifyContent: 'center', borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border },
  cancelButtonText: { color: theme.colors.textSecondary, fontWeight: '700' },
  inlineCreate: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  inlineCreateCompact: { width: '100%' },
  formInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    backgroundColor: theme.colors.inputBackground,
    borderColor: theme.colors.inputBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: theme.colors.textPrimary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    borderColor: theme.colors.infoBorder,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonHovered: { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.accent },
  secondaryButtonText: { color: theme.colors.accent, fontWeight: '700', lineHeight: 18 },
  secondaryButtonTextDisabled: { color: theme.colors.disabledText },
  inputFocused: { borderColor: theme.colors.accentBright, borderWidth: 1.5, shadowColor: theme.colors.accent, shadowOpacity: 0.12, shadowRadius: 6, elevation: 1 },
});
}
