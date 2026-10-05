import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import type { Role } from './store.js';

export type Permission =
  | 'customers.view' | 'customers.create' | 'customers.update' | 'customers.delete'
  | 'inventory.view' | 'inventory.create' | 'inventory.update' | 'inventory.delete'
  | 'sales.view' | 'sales.create' | 'sales.update'
  | 'purchases.view' | 'purchases.create' | 'purchases.update'
  | 'finance.view' | 'finance.create'
  | 'hr.view' | 'hr.create' | 'hr.update'
  | 'projects.view' | 'projects.create' | 'projects.update'
  | 'reports.view' | 'reports.export'
  | 'users.view' | 'users.manage'
  | 'audit.view' | 'company.manage';

const ALL: Permission[] = [
  'customers.view','customers.create','customers.update','customers.delete',
  'inventory.view','inventory.create','inventory.update','inventory.delete',
  'sales.view','sales.create','sales.update','purchases.view','purchases.create','purchases.update',
  'finance.view','finance.create','hr.view','hr.create','hr.update','projects.view','projects.create','projects.update',
  'reports.view','reports.export','users.view','users.manage','audit.view','company.manage'
];

export const rolePermissions: Record<Role, Permission[]> = {
  owner: ALL,
  admin: ALL.filter(permission => permission !== 'company.manage'),
  sales: ['customers.view','customers.create','customers.update','inventory.view','sales.view','sales.create','sales.update','projects.view','projects.create','projects.update','reports.view','users.view'],
  inventory: ['inventory.view','inventory.create','inventory.update','purchases.view','purchases.update','reports.view'],
  viewer: ['customers.view','inventory.view','projects.view']
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req as AuthRequest;
    if (!auth.user || !permissions.every(permission => hasPermission(auth.user!.role, permission))) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}
