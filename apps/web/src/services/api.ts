import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCTION_API = 'https://erp-fanix-global.onrender.com/api/v1';
const configuredApi = process.env.EXPO_PUBLIC_API_URL?.trim();
const isProductionRuntime = process.env.NODE_ENV === 'production';

// Production releases are always pinned to Render so an APK cannot inherit a
// stale localhost/staging URL. Tests and non-production builds may inject an
// explicit API URL; local development keeps localhost as its final fallback.
export const API = (
  !__DEV__ && isProductionRuntime
    ? PRODUCTION_API
    : (configuredApi || (__DEV__ ? 'http://localhost:4000/api/v1' : PRODUCTION_API))
).replace(/\/+$/, '');

const ACCESS_TOKEN_KEY = '@fanix/access-token';
const REFRESH_TOKEN_KEY = '@fanix/refresh-token';

export type Role = 'owner' | 'admin' | 'sales' | 'inventory' | 'viewer';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export type Company = {
  id: string;
  name: string;
  currency?: string;
  enabledModules?: string[];
};

export type Session = {
  token: string;
  refreshToken: string;
  user: PublicUser;
  company: Company;
  role?: Role;
};

export type Dashboard = {
  counts: {
    customers: number;
    products: number;
    sales: number;
    purchases?: number;
    unreadNotifications?: number;
  };
  lowStock: { product: { name: string }; stock: number }[];
  recentActivity?: Array<{ action: string; entity: string; createdAt?: string }>;
  enabledModules?: string[];
};

export type Resource = {
  id?: string;
  name?: string;
  title?: string;
  email?: string;
  status?: string;
  amount?: number;
  category?: string;
  message?: string;
  department?: string;
  phone?: string;
  sku?: string;
  stock?: number;
  createdAt?: string;
  [key: string]: unknown;
};

export const endpointMap: Record<string, string> = {
  Dashboard: 'dashboard',
  Clientes: 'customers',
  Productos: 'products',
  Proveedores: 'suppliers',
  Empleados: 'employees',
  Proyectos: 'projects',
  Finanzas: 'finance/transactions',
  Incidencias: 'incidents',
  Notificaciones: 'notifications',
};

export async function saveTokens(token: string, refreshToken: string) {
  await AsyncStorage.multiSet([[ACCESS_TOKEN_KEY, token], [REFRESH_TOKEN_KEY, refreshToken]]);
}

export async function loadTokens() {
  const values = await AsyncStorage.multiGet([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  return { token: values[0]?.[1] ?? '', refreshToken: values[1]?.[1] ?? '' };
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

async function parseResponse(response: Response) {
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`El servidor respondió con un formato inválido (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const error = new Error(data?.error?.message ?? 'No se pudo completar la solicitud') as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

export async function loginRequest(email: string, password: string): Promise<Session> {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseResponse(response);
}

export async function refreshSession(refreshToken: string): Promise<Session> {
  const response = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return parseResponse(response);
}

export async function authenticatedRequest(path: string, token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API}/${path.replace(/^\//, '')}`, { ...init, headers });
  return parseResponse(response);
}

export async function logoutRequest(token: string) {
  return authenticatedRequest('auth/logout', token, { method: 'POST' });
}
