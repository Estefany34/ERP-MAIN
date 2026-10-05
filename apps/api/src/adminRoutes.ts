import { Router } from 'express';
import { z } from 'zod';
import { db, id, now, toPublicUser, type Role } from './store.js';
import { type AuthRequest } from './auth.js';
import { requirePermission, rolePermissions } from './permissions.js';
import { parseBody } from './http.js';

export const adminRouter = Router();
const dateSchema = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional();
const filtersSchema = z.object({ from: dateSchema, to: dateSchema, status: z.string().trim().max(40).optional(), userId: z.string().uuid().optional() });
const within = (date: string, from?: string, to?: string) => (!from || date >= from) && (!to || date <= `${to}${to.length === 10 ? 'T23:59:59.999Z' : ''}`);

function recordAudit(req: AuthRequest, action: string, entity: string, entityId: string, metadata?: Record<string, string | number | boolean>) {
  db.audits.push({ id: id(), companyId: req.user!.companyId, userId: req.user!.id, role: req.user!.role, action, module: entity === 'report' ? 'reports' : 'administration', entity, entityId, result: 'success', ip: req.ip, metadata, createdAt: now() });
}

adminRouter.get('/permissions', (req: AuthRequest, res) => res.json({ role: req.user!.role, permissions: rolePermissions[req.user!.role] }));

adminRouter.get('/company/users', requirePermission('users.view'), (req: AuthRequest, res) => {
  const users = db.memberships.filter(m => m.companyId === req.user!.companyId).flatMap(m => {
    const user = db.users.find(u => u.id === m.userId); return user ? [{ ...toPublicUser(user), role: m.role, permissions: rolePermissions[m.role] }] : [];
  });
  res.json(users);
});

adminRouter.patch('/company/users/:userId/role', requirePermission('users.manage'), (req: AuthRequest, res) => {
  const input = parseBody(z.object({ role: z.enum(['admin','sales','inventory','viewer']) }), req.body);
  const membership = db.memberships.find(m => m.userId === req.params.userId && m.companyId === req.user!.companyId);
  if (!membership) return res.status(404).json({ error: { code: 'MEMBER_NOT_FOUND', message: 'Company member not found' } });
  if (membership.role === 'owner') return res.status(403).json({ error: { code: 'OWNER_ROLE_PROTECTED', message: 'Owner role cannot be changed here' } });
  const previousRole = membership.role; membership.role = input.role as Role;
  recordAudit(req, 'role.change', 'user', membership.userId, { previousRole, nextRole: membership.role });
  res.json({ userId: membership.userId, role: membership.role, permissions: rolePermissions[membership.role] });
});

adminRouter.get('/audit-logs', requirePermission('audit.view'), (req: AuthRequest, res) => {
  const input = filtersSchema.parse(req.query); const action = typeof req.query.action === 'string' ? req.query.action : undefined; const module = typeof req.query.module === 'string' ? req.query.module : undefined;
  const logs = db.audits.filter(log => log.companyId === req.user!.companyId && within(log.createdAt, input.from, input.to) && (!input.userId || log.userId === input.userId) && (!action || log.action === action) && (!module || log.module === module));
  res.json(logs.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 1000));
});

adminRouter.get('/reports/summary', requirePermission('reports.view'), (req: AuthRequest, res) => {
  const input = filtersSchema.parse(req.query); const companyId = req.user!.companyId;
  const sales = db.sales.filter(x => x.companyId === companyId && within(x.createdAt, input.from, input.to));
  const purchases = db.purchases.filter(x => x.companyId === companyId && within(x.createdAt, input.from, input.to) && (!input.status || x.status === input.status));
  const transactions = db.financialTransactions.filter(x => x.companyId === companyId && within(x.createdAt, input.from, input.to) && (!input.status || x.status === input.status));
  const products = db.products.filter(x => x.companyId === companyId);
  const stock = products.map(product => ({ id: product.id, name: product.name, stock: db.movements.filter(m => m.companyId === companyId && m.productId === product.id).reduce((sum,m) => sum + (m.type === 'out' ? -m.quantity : m.quantity), 0), minimum: product.stockMinimum }));
  res.json({
    period: { from: input.from ?? null, to: input.to ?? null },
    kpis: { customers: db.customers.filter(x => x.companyId === companyId).length, salesCount: sales.length, salesTotal: sales.reduce((s,x) => s + x.total, 0), purchasesCount: purchases.length, purchasesTotal: purchases.reduce((s,x) => s + x.total, 0), income: transactions.filter(x => x.type === 'income').reduce((s,x) => s + x.amount, 0), expenses: transactions.filter(x => x.type === 'expense').reduce((s,x) => s + x.amount, 0), lowStock: stock.filter(x => x.stock <= x.minimum).length },
    recent: { sales: sales.slice(-10).reverse(), purchases: purchases.slice(-10).reverse(), transactions: transactions.slice(-10).reverse() },
    inventory: { lowStock: stock.filter(x => x.stock <= x.minimum) }
  });
});

adminRouter.get('/reports/export.csv', requirePermission('reports.export'), (req: AuthRequest, res) => {
  const input = filtersSchema.parse(req.query); const companyId = req.user!.companyId;
  const rows = db.sales.filter(x => x.companyId === companyId && within(x.createdAt, input.from, input.to));
  const csv = ['id,createdAt,customerId,total,status', ...rows.map(row => [row.id,row.createdAt,row.customerId,row.total,row.status].map(value => `"${String(value).replaceAll('"','""')}"`).join(','))].join('\n');
  recordAudit(req, 'report.export', 'report', 'sales', { format: 'csv', rows: rows.length });
  res.type('text/csv').attachment('fanix-sales-report.csv').send(csv);
});
