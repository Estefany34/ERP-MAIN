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
import { authenticatedRequest, clearTokens, endpointMap, loadTokens, loginRequest, logoutRequest, refreshSession, saveTokens, type Dashboard, type PublicUser, type Resource, type Role } from './src/services/api';
import { FanixThemeProvider, useFanixTheme } from './src/theme/FanixThemeProvider';
import type { FanixTheme } from './src/theme/fanixTheme';

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
  const [createHovered, setCreateHovered] = useState(false);
  const [token, setToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
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
  const [formValue, setFormValue] = useState('');
  const [companyName, setCompanyName] = useState('');

  const tableColumns = useMemo(() => tableColumnsByModule[active] ?? tableColumnsByModule.Productos, [active]);
  const createRoles: Record<string, Role[]> = {
    Clientes: ['owner', 'admin', 'sales'],
    Productos: ['owner', 'admin', 'inventory'],
    Proveedores: ['owner', 'admin'],
    Empleados: ['owner', 'admin'],
    Proyectos: ['owner', 'admin', 'sales'],
    Finanzas: ['owner', 'admin'],
    Incidencias: ['owner', 'admin', 'sales', 'inventory', 'viewer'],
  };
  const canCreate = Boolean(role && createRoles[active]?.includes(role));

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
              ? { name: formValue, ownerId: user?.id }
              : { name: formValue };

    try {
      const data = await requestWithSession(path, { method: 'POST', body: JSON.stringify(payload) });
      setFormValue('');
      await loadModule(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el registro');
    } finally {
      setBusy(false);
    }
  }

  async function establishSession(nextToken: string, nextRefreshToken: string) {
    const me = await authenticatedRequest('me', nextToken);
    setToken(nextToken);
    setRefreshToken(nextRefreshToken);
    setUser(me.user ?? null);
    setRole(me.role ?? null);
    setCompanyName(me.company?.name ?? '');
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

  async function logout() {
    try {
      if (token) await logoutRequest(token);
    } catch {
      // Local cleanup must still happen if the API is unavailable.
    } finally {
      await clearTokens();
      setToken('');
      setRefreshToken('');
      setUser(null);
      setRole(null);
      setCompanyName('');
      setError('');
      setRows([]);
      setDashboard(null);
      setActive('Dashboard');
    }
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
      } catch {
        await clearTokens();
      } finally {
        if (mounted) setRestoringSession(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!token) return;
    requestWithSession('dashboard')
      .then((data) => setDashboard(data))
      .catch(() => setError('No se pudo cargar el dashboard'));
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

  const inventoryAlerts = dashboard?.lowStock ?? [];
  const recentActivity = dashboard?.recentActivity ?? [];

  if (restoringSession) {
    return <SafeAreaView style={styles.loginPage}><LoadingState label="Restaurando sesión..." /></SafeAreaView>;
  }

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
      userLabel={user?.name ? `${user.name}${role ? ` · ${role}` : ''}` : (role ?? 'Usuario')}
      onLogout={logout}
    >
      {error ? <Card style={styles.notice}><Text accessibilityRole="alert" style={styles.noticeText}>{error}</Text></Card> : null}

      {active === 'Dashboard' ? (
        <>
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
            <Text style={styles.sectionTitle}>{active}</Text>
            {canCreate ? <View style={[styles.inlineCreate, compact && styles.inlineCreateCompact]}>
              <TextInput
                value={formValue}
                onChangeText={setFormValue}
                placeholder={`Nuevo ${active.toLowerCase()}`}
                accessibilityLabel={`Nuevo ${active.toLowerCase()}`}
                onFocus={() => setFocusedField('new-record')}
                onBlur={() => setFocusedField('')}
                placeholderTextColor={theme.colors.inputPlaceholder}
                style={[styles.formInput, focusedField === 'new-record' && styles.inputFocused]}
              />
              <Pressable
                onPress={createRecord}
                onFocus={() => setFocusedField('create')}
                onBlur={() => setFocusedField('')}
                onHoverIn={() => setCreateHovered(true)}
                onHoverOut={() => setCreateHovered(false)}
                disabled={busy || !formValue.trim()}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || !formValue.trim() }}
                style={({ pressed }) => [styles.secondaryButton, createHovered && styles.secondaryButtonHovered, focusedField === 'create' && styles.buttonFocused, pressed && styles.buttonPressed, (busy || !formValue.trim()) && styles.primaryButtonDisabled]}
              >
                <Text style={[styles.secondaryButtonText, (busy || !formValue.trim()) && styles.secondaryButtonTextDisabled]}>{busy ? 'Guardando...' : 'Crear'}</Text>
              </Pressable>
            </View> : null}
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
