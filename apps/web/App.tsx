import React, { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { FanixLogo } from './src/components/branding/FanixLogo';
import { AppShell } from './src/components/layout/AppShell';
import { Badge } from './src/components/ui/Badge';
import { Card } from './src/components/ui/Card';
import { EmptyState } from './src/components/ui/EmptyState';
import { LoadingState } from './src/components/ui/LoadingState';
import { StatCard } from './src/components/ui/StatCard';
import { type Dashboard } from './src/services/api';
import { useSession } from './src/services/session';
import { useModuleNavigation } from './src/services/navigation';
import { modules } from './src/modules/config';
import { ModuleWorkspace } from './src/modules/ModuleWorkspace';
import { FanixThemeProvider, useFanixTheme } from './src/theme/FanixThemeProvider';
import type { FanixTheme } from './src/theme/fanixTheme';
import { LandingPage } from './src/landing/LandingPage';

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
  const { session, restoring, login: signIn, register: signUp, request, logout } = useSession();
  const [publicView, setPublicView] = useState<'landing' | 'login'>('landing');
  const token = session?.token ?? '';
  const role = session?.role ?? 'viewer';
  const requestRef = useRef(request);
  requestRef.current = request;
  const dashboardVersion = useRef(0);
  const loginLock = useRef(false);
  const groups = ['Operaciones', 'Contactos', 'Administración', 'Sistema'];
  const groupOf = (label: string) => ['Productos', 'Inventario', 'Ventas', 'Cotizaciones', 'Compras', 'Proyectos'].includes(label) ? 'Operaciones' : ['Clientes', 'Proveedores'].includes(label) ? 'Contactos' : ['Finanzas', 'Empleados', 'Sucursales', 'Almacenes'].includes(label) ? 'Administración' : 'Sistema';
  const moduleItems = [{ label: 'Inicio', value: 'Dashboard', group: 'General' }, ...modules.filter(module => !module.readRoles || module.readRoles.includes(role)).map(module => ({ label: module.label, value: module.label, group: groupOf(module.label) })).sort((a, b) => groups.indexOf(a.group) - groups.indexOf(b.group))];
  const defaultDemoEmail = __DEV__ ? 'admin@demo.local' : '';
  const defaultDemoPassword = __DEV__ ? 'Admin123!' : '';
  const [email, setEmail] = useState(defaultDemoEmail);
  const [password, setPassword] = useState(defaultDemoPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [active, setActive] = useModuleNavigation();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  async function login() {
    if (loginLock.current) return;
    if (!email.trim() || password.length < 8) { setError('Escribe un correo y una contraseña de al menos 8 caracteres.'); return; }
    loginLock.current = true; setBusy(true); setError('');
    try { await signIn(email, password); setPassword(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo conectar al servidor.'); }
    finally { loginLock.current = false; setBusy(false); }
  }
  async function refreshDashboard() {
    const version = ++dashboardVersion.current;
    setLoadingDashboard(true); setError('');
    try {
      const data = await requestRef.current('dashboard');
      if (version === dashboardVersion.current) setDashboard(data);
    } catch (err) { if (version === dashboardVersion.current) setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard.'); }
    finally { if (version === dashboardVersion.current) setLoadingDashboard(false); }
  }
  useEffect(() => {
    if (token) void refreshDashboard();
    else { dashboardVersion.current++; setDashboard(null); }
    return () => { dashboardVersion.current++; };
  }, [token]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (token && active !== 'Dashboard') { setActive('Dashboard'); return true; }
      return false;
    });
    return () => listener.remove();
  }, [token, active]);
  function selectModule(module: string) {
    setError(''); setActive(module);
    if (module === 'Dashboard') void refreshDashboard();
  }
  async function closeSession() {
    setBusy(true); setError('');
    try { await logout(); setPassword(''); setDashboard(null); setActive('Dashboard', true); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cerrar la sesión. Intenta de nuevo.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (token && !moduleItems.some(item => item.value === active)) setActive('Dashboard', true);
  }, [token, role, active]);
  const activeConfig = modules.find(module => module.label === active);
  const stats = [
    { label: 'Clientes', value: dashboard?.counts?.customers ?? 0, delta: undefined },
    { label: 'Productos', value: dashboard?.counts?.products ?? 0, delta: undefined },
    { label: 'Ventas', value: dashboard?.counts?.sales ?? 0, delta: undefined },
    { label: 'Notificaciones', value: dashboard?.counts?.unreadNotifications ?? 0, delta: undefined },
  ];

  const inventoryAlerts = dashboard?.lowStock ?? [];
  const recentActivity = dashboard?.recentActivity ?? [];

  if (restoring) return <SafeAreaView style={styles.loginPage}><LoadingState label="Restaurando sesión…" /></SafeAreaView>;

  if (!token && publicView === 'landing') return <LandingPage onLogin={() => setPublicView('login')} onRegister={signUp} />;

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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}><View style={styles.loginCard}>
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
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={() => void login()}
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
      </ScrollView></KeyboardAvoidingView></SafeAreaView>
    );
  }

  return (
    <AppShell
      title={active}
      subtitle={session?.company.name}
      userLabel={`${session?.user.name ?? ''} · ${{ owner: 'Propietario', admin: 'Administrador', sales: 'Ventas', inventory: 'Inventario', viewer: 'Consulta' }[role] ?? role}`}
      logoutDisabled={busy}
      navItems={moduleItems}
      activeItem={active}
      onSelect={selectModule}
      onLogout={() => void closeSession()}
    >
      {error ? <Card style={styles.notice}><Text accessibilityRole="alert" style={styles.noticeText}>{error}</Text></Card> : null}

      {active === 'Dashboard' ? (
        <>
          <Text style={styles.sectionTitle}>Resumen general</Text>
          <Text style={styles.subtitle}>Consulta la operación y accede a las tareas más frecuentes.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable accessibilityRole="button" onPress={() => selectModule('Clientes')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Ver clientes</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => selectModule('Productos')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Gestionar productos</Text></Pressable>
          </View>
          <Pressable accessibilityRole="button" disabled={loadingDashboard} onPress={() => void refreshDashboard()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Actualizar indicadores</Text></Pressable>
          {loadingDashboard ? <LoadingState label="Actualizando dashboard…" /> : null}
          {!dashboard && !loadingDashboard ? <EmptyState title="Indicadores no disponibles" description="Actualiza para volver a intentar." /> : null}
          {dashboard ? <>
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
          </> : null}
        </>
      ) : (
        activeConfig && (!activeConfig.readRoles || activeConfig.readRoles.includes(role)) ? <ModuleWorkspace key={`${session?.user.id}-${active}`} config={activeConfig} role={role} userId={session!.user.id} currency={session!.company.currency} request={request} onChanged={() => void refreshDashboard()} /> : <LoadingState label="Abriendo dashboard…" />
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
