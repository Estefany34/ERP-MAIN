import { useEffect, useRef, useState } from 'react';
import { API, clearTokens, loadTokens, saveTokens } from './api';

type Session = { token: string; refreshToken: string; user: { id: string; name: string }; company: { name: string; currency: string; enabledModules: string[] }; role: string };
const messages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.', FORBIDDEN: 'Tu rol no permite esta acción.',
  VALIDATION_ERROR: 'Revisa los campos y sus valores.', INSUFFICIENT_STOCK: 'No hay existencias suficientes.',
  SKU_EXISTS: 'Ese SKU ya existe.', OWNER_NOT_MEMBER: 'Selecciona un responsable de tu empresa.',
  PRODUCT_NOT_FOUND: 'El producto ya no existe o no pertenece a tu empresa.', CUSTOMER_NOT_FOUND: 'Selecciona un cliente de tu empresa.',
  SUPPLIER_NOT_FOUND: 'Selecciona un proveedor de tu empresa.', SESSION_EXPIRED: 'Tu sesión terminó. Inicia sesión de nuevo.',
  INVALID_REFRESH_TOKEN: 'Tu sesión terminó. Inicia sesión de nuevo.',
  INVALID_STATE: 'El registro ya cambió de estado. Actualiza la lista.',
};
export async function fetchJson(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${API}/${path}`, { ...init, signal: controller.signal });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { throw new Error('El servidor devolvió una respuesta inesperada. Intenta de nuevo.'); }
    return { response, data };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('El servidor tardó demasiado. Revisa tu conexión y vuelve a intentar.');
    if (error instanceof TypeError) throw new Error('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
    throw error;
  } finally { clearTimeout(timeout); }
}
function errorMessage(data: any, status: number) {
  return messages[data.error?.code] ?? (status === 401 ? 'Tu sesión terminó. Inicia sesión de nuevo.' : data.error?.message ?? 'No se pudo completar la solicitud.');
}
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const current = useRef<Session | null>(null);
  const refresh = useRef<Promise<Session> | null>(null);
  function assign(value: Session | null) { current.current = value; setSession(value); }
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await loadTokens();
        if (!stored.refreshToken) return;
        const fresh = await fetchJson('auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: stored.refreshToken }) });
        if (!fresh.response.ok) { if ([401, 403].includes(fresh.response.status)) await clearTokens(); return; }
        await saveTokens(fresh.data.token, fresh.data.refreshToken);
        const me = await fetchJson('me', { headers: { Authorization: `Bearer ${fresh.data.token}` } });
        if (!me.response.ok || !mounted) return;
        if (mounted) assign({ ...fresh.data, role: me.data.role });
      } catch { /* Preserve stored tokens when the network is temporarily unavailable. */ }
      finally { if (mounted) setRestoring(false); }
    })();
    return () => { mounted = false; };
  }, []);
  async function register(input: { email: string; password: string; name: string; companyName: string; planId: string; billingCycle: 'monthly' | 'annual'; modules: string[]; industry?: string; employeeCount?: number; country?: string; taxId?: string }) {
    const { response, data } = await fetchJson('auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error(errorMessage(data, response.status));
    await saveTokens(data.token, data.refreshToken);
    assign({ ...data, role: 'owner' });
  }
  async function login(email: string, password: string) {
    const { response, data } = await fetchJson('auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }) });
    if (!response.ok) throw new Error(errorMessage(data, response.status));
    const me = await fetchJson('me', { headers: { Authorization: `Bearer ${data.token}` } });
    if (!me.response.ok) throw new Error(errorMessage(me.data, me.response.status));
    await saveTokens(data.token, data.refreshToken);
    assign({ ...data, role: me.data.role });
  }
  async function request(path: string, init: RequestInit = {}) {
    const started = current.current;
    if (!started) throw new Error('Inicia sesión para continuar.');
    const send = (token: string) => fetchJson(path, { ...init, headers: { 'Content-Type': 'application/json', ...init.headers, Authorization: `Bearer ${token}` } });
    let result = await send(started.token);
    // A concurrent request may already have renewed the same session.
    if (result.response.status === 401 && current.current && current.current.token !== started.token && current.current.user.id === started.user.id) result = await send(current.current.token);
    if (result.response.status === 401 && current.current) {
      if (!refresh.current) {
        refresh.current = (async () => {
          const active = current.current!;
          const fresh = await fetchJson('auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: active.refreshToken }) });
          if (!fresh.response.ok) {
            if (current.current === active && [401, 403].includes(fresh.response.status)) { await clearTokens(); assign(null); }
            throw new Error(errorMessage(fresh.data, fresh.response.status));
          }
          if (current.current !== active) throw new Error('La sesión cambió.');
          const value = { ...active, ...fresh.data };
          await saveTokens(value.token, value.refreshToken);
          assign(value); return value;
        })().finally(() => { refresh.current = null; });
      }
      const renewed = await refresh.current;
      result = await send(renewed.token);
    }
    if (!current.current || current.current.user.id !== started.user.id) throw new Error('Tu sesión terminó.');
    if (!result.response.ok) throw new Error(errorMessage(result.data, result.response.status));
    return result.data;
  }
  async function logout() {
    const active = current.current;
    if (!active) return;
    try { await request('auth/logout', { method: 'POST' }); }
    finally { await clearTokens(); assign(null); }
  }
  return { session, restoring, login, register, request, logout };
}
