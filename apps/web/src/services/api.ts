export const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

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
