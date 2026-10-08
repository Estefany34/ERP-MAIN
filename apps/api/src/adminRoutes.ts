import { Router } from 'express';
import { z } from 'zod';
import { db, id, now, toPublicUser, type Role } from './store.js';
import { type AuthRequest } from './auth.js';
import { hasPermission, requirePermission, rolePermissions, type Permission } from './permissions.js';
import { parseBody } from './http.js';
import { buildReport, buildReportSummary, parseReportFilters, parseReportType, reportAuditMetadata, reportExportSchema, reportOptions, type ReportType } from './reporting.js';

export const adminRouter = Router();
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
const dateSchema = z.string().datetime({ offset: true }).or(dateOnlySchema).optional();
const filtersSchema = z.object({ from: dateSchema, to: dateSchema, status: z.string().trim().max(40).optional(), userId: z.string().uuid().optional() }).superRefine((filters, context) => {
  const from = filters.from ? Date.parse(filters.from.length === 10 ? `${filters.from}T00:00:00.000Z` : filters.from) : undefined;
  const to = filters.to ? Date.parse(filters.to.length === 10 ? `${filters.to}T23:59:59.999Z` : filters.to) : undefined;
  if (from !== undefined && to !== undefined && from > to) context.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'La fecha inicial no puede ser posterior a la fecha final.' });
});
const within = (date: string, from?: string, to?: string) => {
  const instant = Date.parse(date);
  const start = from ? Date.parse(from.length === 10 ? `${from}T00:00:00.000Z` : from) : undefined;
  const end = to ? Date.parse(to.length === 10 ? `${to}T23:59:59.999Z` : to) : undefined;
  return Number.isFinite(instant) && (start === undefined || instant >= start) && (end === undefined || instant <= end);
};
const reportViewPermissions = {
  sales: ['sales.view'],
  purchases: ['purchases.view'],
  inventory: ['inventory.view'],
  finance: ['finance.view'],
  customers: ['customers.view'],
  executive: ['sales.view', 'purchases.view', 'finance.view', 'inventory.view', 'customers.view'],
} satisfies Record<ReportType, Permission[]>;

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
  const required = ['sales.view', 'purchases.view', 'finance.view', 'inventory.view', 'customers.view'] as const;
  if (!required.every(permission => hasPermission(req.user!.role, permission))) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
  const input = filtersSchema.parse(req.query); const companyId = req.user!.companyId;
  res.json(buildReportSummary(companyId, input));
});

adminRouter.get('/reports/export.csv', requirePermission('reports.export'), (req: AuthRequest, res) => {
  const input = filtersSchema.parse(req.query); const companyId = req.user!.companyId;
  const rows = db.sales.filter(x => x.companyId === companyId && within(x.createdAt, input.from, input.to));
  const csv = ['id,createdAt,customerId,total,status', ...rows.map(row => [row.id,row.createdAt,row.customerId,row.total,row.status].map(value => `"${String(value).replaceAll('"','""')}"`).join(','))].join('\n');
  recordAudit(req, 'report.export', 'report', 'sales', { format: 'csv', rows: rows.length });
  res.type('text/csv').attachment('fanix-sales-report.csv').send(csv);
});

adminRouter.get('/reports/options', requirePermission('reports.view'), (req: AuthRequest, res) => {
  const options = reportOptions(req.user!.companyId);
  res.json({
    ...options,
    customers: hasPermission(req.user!.role, 'customers.view') ? options.customers : [],
    suppliers: hasPermission(req.user!.role, 'purchases.view') ? options.suppliers : [],
  });
});

adminRouter.get('/reports/:type', requirePermission('reports.view'), (req: AuthRequest, res) => {
  const type = parseReportType(req.params.type);
  const required = reportViewPermissions[type];
  if (!required.every(permission => hasPermission(req.user!.role, permission))) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
  const filters = parseReportFilters(type, req.query);
  res.json(buildReport(req.user!.companyId, type, filters));
});

adminRouter.post('/reports/export-audit', requirePermission('reports.export'), (req: AuthRequest, res) => {
  const input = parseBody(reportExportSchema, req.body);
  const filters = parseReportFilters(input.type, input.filters);
  const report = buildReport(req.user!.companyId, input.type, filters);
  recordAudit(req, 'report.export', 'report', input.type, reportAuditMetadata(input.type, input.format, filters, report.rows.length));
  res.status(201).json({ recorded: true, rows: report.rows.length });
});
