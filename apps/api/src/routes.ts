import { Router } from 'express';
import { z } from 'zod';
import { db, id, now, toPublicUser, type Customer, type Product } from './store.js';
import { asyncRoute, parseBody } from './http.js';
import { bomSchema, branchSchema, customerSchema, documentSchema, documentUploadSchema, employeeSchema, incidentSchema, loginSchema, movementSchema, paymentSchema, productionSchema, productSchema, projectSchema, purchaseSchema, quoteSchema, registerSchema, saleSchema, supplierSchema, taskSchema, transactionSchema, warehouseSchema } from './validation.js';
import { createSession, hashPassword, hashRefreshToken, issueRefreshToken, issueToken, requireAuth, requireRole, verifyPassword, type AuthRequest } from './auth.js';
import { readDocument, writeDocument } from './storage.js';
import { isPublicRegistrationAllowed } from './app.js';

export const router = Router();

const moduleCatalog = [
  { id: 'crm', name: 'Clientes / CRM' }, { id: 'sales', name: 'Ventas y cotizaciones' },
  { id: 'inventory', name: 'Inventario y productos' }, { id: 'purchases', name: 'Compras y proveedores' },
  { id: 'finance', name: 'Finanzas' }, { id: 'hr', name: 'Recursos humanos' },
  { id: 'projects', name: 'Proyectos' }, { id: 'reports', name: 'Reportes' }
] as const;
const plans = [
  { id: 'starter', name: 'Starter', userLimit: 5, moduleLimit: 3, monthlyPrice: 499, includedModules: ['crm','sales','inventory'] },
  { id: 'professional', name: 'Professional', userLimit: 25, moduleLimit: 6, monthlyPrice: 1299, includedModules: ['crm','sales','inventory','purchases','finance','reports'] },
  { id: 'business', name: 'Business', userLimit: 100, moduleLimit: 8, monthlyPrice: 2499, includedModules: moduleCatalog.map(item => item.id) }
] as const;
const routeModule: Record<string, string> = {
  customers: 'crm', products: 'inventory', inventory: 'inventory', sales: 'sales', quotes: 'sales',
  suppliers: 'purchases', purchases: 'purchases', finance: 'finance', employees: 'hr', projects: 'projects',
  reports: 'reports'
};
router.get('/catalog', (_req, res) => res.json({ plans, modules: moduleCatalog }));

function audit(req: AuthRequest, entity: string, entityId: string, action: string) {
  db.audits.push({ id: id(), companyId: req.user!.companyId, userId: req.user!.id, entity, entityId, action, createdAt: now() });
}
router.post('/auth/login', asyncRoute(async (req, res) => {
  const input = parseBody(loginSchema, req.body); const user = db.users.find(item => item.email === input.email.toLowerCase());
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
  const membership = db.memberships.find(item => item.userId === user.id); if (!membership) return res.status(403).json({ error: { code: 'NO_MEMBERSHIP', message: 'No active company membership' } });
  const session = createSession(user.id, membership.companyId, membership.role);
  const refreshHash = await hashRefreshToken(session.refreshToken);
  const activeSession = db.sessions.find(item => item.id === session.sessionId);
  if (activeSession) activeSession.refreshTokenHash = refreshHash;
  res.json({ token: issueToken(user.id, membership.companyId, membership.role, session.sessionId), refreshToken: session.refreshToken, user: toPublicUser(user), company: db.companies.find(item => item.id === membership.companyId) });
}));
router.post('/auth/register', asyncRoute(async (req, res) => {
  if (!isPublicRegistrationAllowed()) {
    return res.status(403).json({ error: { code: 'REGISTRATION_DISABLED', message: 'Public registration is disabled in this environment' } });
  }
  const input = parseBody(registerSchema, req.body);
  if (db.users.some(user => user.email === input.email!.toLowerCase())) return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } });
  const plan = plans.find(item => item.id === input.planId) ?? plans[0];
  const requestedModules = input.modules?.length ? input.modules : [...plan.includedModules];
  if (requestedModules.length > plan.moduleLimit) return res.status(400).json({ error: { code: 'PLAN_MODULE_LIMIT', message: 'Selected modules exceed the plan limit' } });
  const user = { id: id(), email: input.email.toLowerCase(), name: input.name, passwordHash: await hashPassword(input.password), createdAt: now() };
  const company = { id: id(), name: input.companyName, currency: 'MXN', enabledModules: requestedModules, industry: input.industry, employeeCount: input.employeeCount, country: input.country, taxId: input.taxId, createdAt: now() };
  db.users.push(user); db.companies.push(company); db.memberships.push({ userId: user.id, companyId: company.id, role: 'owner' });
  const createdAt = now();
  db.subscriptions.push({ id: id(), companyId: company.id, planId: plan.id, status: 'trial', billingCycle: input.billingCycle, trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), createdAt, updatedAt: createdAt });
  const session = createSession(user.id, company.id, 'owner');
  const refreshHash = await hashRefreshToken(session.refreshToken);
  const activeSession = db.sessions.find(item => item.id === session.sessionId);
  if (activeSession) activeSession.refreshTokenHash = refreshHash;
  res.status(201).json({ token: issueToken(user.id, company.id, 'owner', session.sessionId), refreshToken: session.refreshToken, user: toPublicUser(user), company });
}));
router.post('/auth/refresh', asyncRoute(async (req, res) => {
  const refreshToken = typeof req.body === 'object' && req.body && 'refreshToken' in req.body ? String((req.body as { refreshToken?: string }).refreshToken ?? '') : '';
  if (!refreshToken) return res.status(400).json({ error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token is required' } });
  try {
    const payload = (await import('jsonwebtoken')).default.verify(refreshToken, (await import('./auth.js')).getJwtSecret()) as { sub: string; companyId: string; sid: string; tokenType: string };
    if (payload.tokenType !== 'refresh') return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token type mismatch' } });
    const session = db.sessions.find(item => item.id === payload.sid && item.userId === payload.sub && item.companyId === payload.companyId && !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now());
    if (!session) return res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Session expired or revoked' } });
    const valid = await verifyPassword(refreshToken, session.refreshTokenHash || '$2a$12$invalid');
    if (!valid) return res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid' } });
    const nextRefreshToken = issueRefreshToken(session.userId, session.companyId, session.id);
    session.refreshTokenHash = await hashRefreshToken(nextRefreshToken);
    session.lastUsedAt = now();
    const membership = db.memberships.find(item => item.userId === session.userId && item.companyId === session.companyId);
    if (!membership) return res.status(403).json({ error: { code: 'NO_MEMBERSHIP', message: 'Company membership required' } });
    const user = db.users.find(item => item.id === session.userId);
    if (!user) return res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or expired' } });
    res.json({ token: issueToken(session.userId, session.companyId, membership.role, session.id), refreshToken: nextRefreshToken, user: toPublicUser(user), company: db.companies.find(item => item.id === session.companyId) });
  } catch {
    res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or expired' } });
  }
}));
router.post('/auth/logout', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
  const session = req.sessionId ? db.sessions.find(item => item.id === req.sessionId && item.userId === req.user!.id && item.companyId === req.user!.companyId) : undefined;
  if (session) { session.revokedAt = now(); session.lastUsedAt = now(); }
  res.json({ success: true });
}));

router.use(requireAuth);
router.use((req: AuthRequest, res, next) => {
  const key = req.path.split('/').filter(Boolean)[0] ?? '';
  const requiredModule = routeModule[key];
  if (!requiredModule) return next();
  const company = db.companies.find(item => item.id === req.user!.companyId);
  if (!company?.enabledModules.includes(requiredModule)) return res.status(403).json({ error: { code: 'MODULE_NOT_ENABLED', message: 'This module is not enabled for the company plan' } });
  next();
});
router.get('/me', (req: AuthRequest, res) => { const user = db.users.find(item => item.id === req.user!.id); res.json({ user: user ? toPublicUser(user) : undefined, company: db.companies.find(item => item.id === req.user!.companyId), role: req.user!.role }); });
router.get('/subscription', (req: AuthRequest, res) => {
  const subscription = db.subscriptions.find(item => item.companyId === req.user!.companyId);
  const plan = subscription ? plans.find(item => item.id === subscription.planId) : undefined;
  res.json({ subscription, plan });
});
router.post('/company/invitations', requireRole('owner', 'admin'), (req: AuthRequest, res) => {
  const schema = z.object({ email: z.string().trim().email(), role: z.enum(['admin','sales','inventory','viewer']) });
  const input = parseBody(schema, req.body);
  const subscription = db.subscriptions.find(item => item.companyId === req.user!.companyId);
  const plan = (subscription ? plans.find(item => item.id === subscription.planId) : undefined) ?? plans[0];
  const memberCount = db.memberships.filter(item => item.companyId === req.user!.companyId).length;
  if (memberCount >= plan.userLimit) return res.status(409).json({ error: { code: 'PLAN_USER_LIMIT', message: 'User limit reached for current plan' } });
  const invitation = { id: id(), companyId: req.user!.companyId, email: input.email.toLowerCase(), role: input.role, token: id(), status: 'pending' as const, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), createdBy: req.user!.id, createdAt: now() };
  db.invitations.push(invitation);
  res.status(201).json(invitation);
});
router.get('/company/invitations', requireRole('owner', 'admin'), (req: AuthRequest, res) => res.json(db.invitations.filter(item => item.companyId === req.user!.companyId)));
router.get('/customers', (req: AuthRequest, res) => { const search = String(req.query.search ?? '').toLowerCase(); res.json(db.customers.filter(item => item.companyId === req.user!.companyId && (!search || item.name.toLowerCase().includes(search) || item.email?.toLowerCase().includes(search)))); });
router.post('/customers', requireRole('owner', 'admin', 'sales'), (req: AuthRequest, res) => { const input = parseBody(customerSchema, req.body); const customer: Customer = { id: id(), companyId: req.user!.companyId, ...input, createdAt: now() }; db.customers.push(customer); db.audits.push({ id: id(), companyId: req.user!.companyId, userId: req.user!.id, action: 'create', entity: 'customer', entityId: customer.id, createdAt: now() }); res.status(201).json(customer); });
router.get('/products', (req: AuthRequest, res) => res.json(db.products.filter(item => item.companyId === req.user!.companyId).map(product => ({ ...product, stock: db.movements.filter(move => move.companyId === product.companyId && move.productId === product.id).reduce((sum, move) => sum + (move.type === 'out' ? -move.quantity : move.quantity), 0) }))));
router.post('/products', requireRole('owner', 'admin', 'inventory'), (req: AuthRequest, res) => { const input = parseBody(productSchema, req.body); if (db.products.some(item => item.companyId === req.user!.companyId && item.sku.toLowerCase() === input.sku.toLowerCase())) return res.status(409).json({ error: { code: 'SKU_EXISTS', message: 'SKU already exists in this company' } }); const product: Product = { id: id(), companyId: req.user!.companyId, ...input, createdAt: now() }; db.products.push(product); res.status(201).json(product); });
router.get('/suppliers', (req: AuthRequest, res) => res.json(db.suppliers.filter(item => item.companyId === req.user!.companyId)));
router.post('/suppliers', requireRole('owner', 'admin'), (req: AuthRequest, res) => { const input = parseBody(supplierSchema, req.body); const supplier = { id: id(), companyId: req.user!.companyId, ...input, status: 'active' as const, createdAt: now() }; db.suppliers.push(supplier); res.status(201).json(supplier); });
router.get('/purchases', (req: AuthRequest, res) => res.json(db.purchases.filter(item => item.companyId === req.user!.companyId)));
router.post('/purchases', requireRole('owner', 'admin'), (req: AuthRequest, res) => { const key = req.header('idempotency-key'); if (!key) return res.status(400).json({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Idempotency-Key header is required' } }); const previous = db.purchases.find(item => item.companyId === req.user!.companyId && item.idempotencyKey === key); if (previous) return res.json(previous); const input = parseBody(purchaseSchema, req.body); if (input.items.some(item => !db.products.some(product => product.id === item.productId && product.companyId === req.user!.companyId))) return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } }); const supplier = db.suppliers.find(item => item.id === input.supplierId && item.companyId === req.user!.companyId); if (!supplier) return res.status(404).json({ error: { code: 'SUPPLIER_NOT_FOUND', message: 'Supplier not found' } }); const items = input.items.map(item => { const product = db.products.find(candidate => candidate.id === item.productId && candidate.companyId === req.user!.companyId); if (!product) throw new Error('PRODUCT_NOT_FOUND'); return { productId: product.id, quantity: item.quantity, unitCost: item.unitCost ?? product.cost }; }); const purchase = { id: id(), companyId: req.user!.companyId, supplierId: input.supplierId, items, total: items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0), status: 'draft' as const, idempotencyKey: key, createdAt: now() }; db.purchases.push(purchase); res.status(201).json(purchase); });
router.post('/purchases/:purchaseId/approve', requireRole('owner', 'admin'), (req: AuthRequest, res) => { const purchase = db.purchases.find(item => item.id === req.params.purchaseId && item.companyId === req.user!.companyId); if (!purchase) return res.status(404).json({ error: { code: 'PURCHASE_NOT_FOUND', message: 'Purchase not found' } }); if (purchase.status !== 'draft') return res.status(409).json({ error: { code: 'INVALID_STATE', message: 'Only draft purchases can be approved' } }); purchase.status = 'approved'; audit(req, 'purchase', purchase.id, 'approve'); res.json(purchase); });
router.post('/purchases/:purchaseId/reject', requireRole('owner', 'admin'), (req: AuthRequest, res) => { const purchase = db.purchases.find(item => item.id === req.params.purchaseId && item.companyId === req.user!.companyId); if (!purchase) return res.status(404).json({ error: { code: 'PURCHASE_NOT_FOUND', message: 'Purchase not found' } }); if (purchase.status !== 'draft') return res.status(409).json({ error: { code: 'INVALID_STATE', message: 'Only draft purchases can be rejected' } }); purchase.status = 'rejected'; audit(req, 'purchase', purchase.id, 'reject'); res.json(purchase); });
router.post('/purchases/:purchaseId/receive', requireRole('owner', 'admin', 'inventory'), (req: AuthRequest, res) => { const purchase = db.purchases.find(item => item.id === req.params.purchaseId && item.companyId === req.user!.companyId); if (!purchase) return res.status(404).json({ error: { code: 'PURCHASE_NOT_FOUND', message: 'Purchase not found' } }); if (purchase.status !== 'approved') return res.status(409).json({ error: { code: 'INVALID_STATE', message: 'Only approved purchases can be received' } }); for (const item of purchase.items) db.movements.push({ id: id(), companyId: req.user!.companyId, productId: item.productId, type: 'in', quantity: item.quantity, reference: `purchase:${purchase.id}`, idempotencyKey: `purchase:${purchase.id}:${item.productId}`, createdAt: now() }); purchase.status = 'received'; audit(req, 'purchase', purchase.id, 'receive'); res.json(purchase); });
router.post('/inventory/movements', requireRole('owner', 'admin', 'inventory'), (req: AuthRequest, res) => { const input = parseBody(movementSchema, req.body); const product = db.products.find(item => item.id === input.productId && item.companyId === req.user!.companyId); if (!product) return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } }); if (input.idempotencyKey) { const previous = db.movements.find(item => item.companyId === req.user!.companyId && item.idempotencyKey === input.idempotencyKey); if (previous) return res.json(previous); } const current = db.movements.filter(item => item.companyId === req.user!.companyId && item.productId === input.productId).reduce((sum, item) => sum + (item.type === 'out' ? -item.quantity : item.quantity), 0); if (input.type === 'out' && current < input.quantity) return res.status(409).json({ error: { code: 'INSUFFICIENT_STOCK', message: 'Insufficient stock' } }); const movement = { id: id(), companyId: req.user!.companyId, ...input, createdAt: now() }; db.movements.push(movement); res.status(201).json(movement); });
router.get('/sales', (req: AuthRequest, res) => res.json(db.sales.filter(item => item.companyId === req.user!.companyId)));
router.post('/sales', requireRole('owner', 'admin', 'sales'), (req: AuthRequest, res) => { const key = req.header('idempotency-key'); if (!key) return res.status(400).json({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Idempotency-Key header is required' } }); const previous = db.sales.find(item => item.companyId === req.user!.companyId && item.idempotencyKey === key); if (previous) return res.json(previous); const input = parseBody(saleSchema, req.body); const customer = db.customers.find(item => item.id === input.customerId && item.companyId === req.user!.companyId); if (!customer) return res.status(404).json({ error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } }); const items = input.items.map(item => { const product = db.products.find(candidate => candidate.id === item.productId && candidate.companyId === req.user!.companyId); if (!product) throw new Error('PRODUCT_NOT_FOUND'); const stock = db.movements.filter(move => move.companyId === req.user!.companyId && move.productId === product.id).reduce((sum, move) => sum + (move.type === 'out' ? -move.quantity : move.quantity), 0); if (stock < item.quantity) throw new Error('INSUFFICIENT_STOCK'); return { productId: product.id, quantity: item.quantity, unitPrice: item.unitPrice ?? product.price }; }); const sale = { id: id(), companyId: req.user!.companyId, customerId: input.customerId, items, total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), status: 'confirmed' as const, idempotencyKey: key, createdAt: now() }; db.sales.push(sale); for (const item of items) db.movements.push({ id: id(), companyId: req.user!.companyId, productId: item.productId, type: 'out', quantity: item.quantity, reference: `sale:${sale.id}`, idempotencyKey: `sale:${sale.id}:${item.productId}`, createdAt: now() }); audit(req, 'sale', sale.id, 'confirm'); res.status(201).json(sale); });
router.get('/quotes', (req: AuthRequest, res) => res.json(db.quotes.filter(item => item.companyId === req.user!.companyId)));
router.post('/quotes', requireRole('owner', 'admin', 'sales'), (req: AuthRequest, res) => { const input = parseBody(quoteSchema, req.body); const customer = db.customers.find(item => item.id === input.customerId && item.companyId === req.user!.companyId); if (!customer) return res.status(404).json({ error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } }); const items = input.items.map(item => { const product = db.products.find(candidate => candidate.id === item.productId && candidate.companyId === req.user!.companyId); if (!product) throw new Error('PRODUCT_NOT_FOUND'); return { productId: product.id, quantity: item.quantity, unitPrice: item.unitPrice ?? product.price }; }); const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0); const tax = subtotal * (input.taxRate ?? 0); const quote = { id: id(), companyId: req.user!.companyId, customerId: input.customerId, items, subtotal, tax, total: subtotal + tax, status: 'draft' as const, createdAt: now() }; db.quotes.push(quote); res.status(201).json(quote); });
router.get('/finance/transactions', (req: AuthRequest, res) => res.json(db.financialTransactions.filter(item => item.companyId === req.user!.companyId)));
router.post('/finance/transactions', requireRole('owner', 'admin'), (req: AuthRequest, res) => { const input = parseBody(transactionSchema, req.body); const tx = { id: id(), companyId: req.user!.companyId, ...input, createdAt: now() }; db.financialTransactions.push(tx); res.status(201).json(tx); });
router.post('/payments', requireRole('owner', 'admin'), (req: AuthRequest, res) => { const key = req.header('idempotency-key'); if (!key) return res.status(400).json({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Idempotency-Key header is required' } }); const previous = db.payments.find(item => item.companyId === req.user!.companyId && item.idempotencyKey === key); if (previous) return res.json(previous); const input = parseBody(paymentSchema, req.body); const payment = { id: id(), companyId: req.user!.companyId, ...input, idempotencyKey: key, createdAt: now() }; db.payments.push(payment); res.status(201).json(payment); });
router.get('/employees', (req: AuthRequest, res) => res.json(db.employees.filter(item => item.companyId === req.user!.companyId)));
router.post('/employees', requireRole('owner', 'admin'), (req: AuthRequest, res) => { const input = parseBody(employeeSchema, req.body); const employee = { id: id(), companyId: req.user!.companyId, ...input, createdAt: now() }; db.employees.push(employee); res.status(201).json(employee); });
router.get('/projects', (req: AuthRequest, res) => res.json(db.projects.filter(item => item.companyId === req.user!.companyId)));
router.post('/projects', requireRole('owner', 'admin', 'sales'), (req: AuthRequest, res) => { const input = parseBody(projectSchema, req.body); const project = { id: id(), companyId: req.user!.companyId, ...input, ownerId: req.user!.id, createdAt: now() }; db.projects.push(project); res.status(201).json(project); });
router.post('/tasks', requireRole('owner', 'admin', 'sales'), (req: AuthRequest, res) => { const input = parseBody(taskSchema, req.body); if (!db.projects.some(item => item.id === input.projectId && item.companyId === req.user!.companyId)) return res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' } }); const task = { id: id(), companyId: req.user!.companyId, ...input, createdAt: now() }; db.tasks.push(task); res.status(201).json(task); });
router.post('/notifications', requireRole('owner', 'admin'), (req: AuthRequest, res) => { const input = parseBody(z.object({ userId: z.string().uuid().optional(), type: z.string().trim().min(1).max(50), message: z.string().trim().min(1).max(1000), dedupeKey: z.string().trim().min(1).max(120) }), req.body); const previous = db.notifications.find(item => item.companyId === req.user!.companyId && item.dedupeKey === input.dedupeKey); if (previous) return res.json(previous); const notification = { id: id(), companyId: req.user!.companyId, ...input, createdAt: now() }; db.notifications.push(notification); res.status(201).json(notification); });
router.post('/documents', requireRole('owner', 'admin'), (req: AuthRequest, res) => { const input = parseBody(documentSchema, req.body); const document = { id: id(), companyId: req.user!.companyId, ...input, createdBy: req.user!.id, createdAt: now() }; db.documents.push(document); res.status(201).json(document); });
router.post('/documents/upload', requireRole('owner', 'admin'), asyncRoute(async (req: AuthRequest, res) => { const input = parseBody(documentUploadSchema, req.body); const document = { id: id(), companyId: req.user!.companyId, name: input.name, category: input.category, storageKey: `${req.user!.companyId}/${id()}-${input.name}`, entity: input.entity, entityId: input.entityId, createdBy: req.user!.id, createdAt: now() }; await writeDocument(document.storageKey, Buffer.from(input.contentBase64, 'base64')); db.documents.push(document); res.status(201).json(document); }));
router.get('/documents/:documentId/download', asyncRoute(async (req: AuthRequest, res) => { const document = db.documents.find(item => item.id === req.params.documentId && item.companyId === req.user!.companyId); if (!document) return res.status(404).json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' } }); const content = await readDocument(document.storageKey); if (!content) return res.status(404).json({ error: { code: 'DOCUMENT_CONTENT_NOT_FOUND', message: 'Document content not found' } }); res.type('application/octet-stream').send(content); }));
router.get('/incidents', (req: AuthRequest, res) => res.json(db.incidents.filter(item => item.companyId === req.user!.companyId)));
router.post('/incidents', (req: AuthRequest, res) => { const input = parseBody(incidentSchema, req.body); const incident = { id: id(), companyId: req.user!.companyId, ...input, status: 'open' as const, createdBy: req.user!.id, createdAt: now() }; db.incidents.push(incident); res.status(201).json(incident); });
router.post('/production/orders', requireRole('owner', 'admin', 'inventory'), (req: AuthRequest, res) => { const input = parseBody(productionSchema, req.body); const order = { id: id(), companyId: req.user!.companyId, ...input, status: 'planned' as const, createdAt: now() }; db.productionOrders.push(order); res.status(201).json(order); });
router.post('/branches', requireRole('owner', 'admin'), (req: AuthRequest, res) => { const input = parseBody(branchSchema, req.body); const branch = { id: id(), companyId: req.user!.companyId, ...input, active: true, createdAt: now() }; db.branches.push(branch); res.status(201).json(branch); });
router.post('/warehouses', requireRole('owner', 'admin', 'inventory'), (req: AuthRequest, res) => { const input = parseBody(warehouseSchema, req.body); const warehouse = { id: id(), companyId: req.user!.companyId, ...input, createdAt: now() }; db.warehouses.push(warehouse); res.status(201).json(warehouse); });
router.post('/boms', requireRole('owner', 'admin', 'inventory'), (req: AuthRequest, res) => { const input = parseBody(bomSchema, req.body); const bom = { id: id(), companyId: req.user!.companyId, ...input, createdAt: now() }; db.billsOfMaterial.push(bom); res.status(201).json(bom); });
