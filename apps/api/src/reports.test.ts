import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from './app.js';
import { issueToken } from './auth.js';
import { db, id, now, seedOwner, type Company } from './store.js';

test('report types filter company data, enforce report permissions, calculate KPIs and audit exports', async () => {
  await seedOwner();
  const company = db.companies[0]!;
  const owner = db.users[0]!;
  const ownerToken = issueToken(owner.id, company.id, 'owner');
  const date = '2026-10-15T12:00:00.000Z';

  const customerId = id();
  const customer = { id: customerId, companyId: company.id, name: 'Pedro Cliente', email: 'pedro@example.test', phone: '+5215555555555', classification: 'Preferente', createdAt: date };
  db.customers.push(customer);
  const supplierId = id();
  db.suppliers.push({ id: supplierId, companyId: company.id, name: 'Proveedor Uno', status: 'active', createdAt: date });
  const productId = id();
  db.products.push({ id: productId, companyId: company.id, sku: 'REP-1', name: 'Producto de reporte', price: 50, cost: 20, stockMinimum: 5, createdAt: date });
  db.movements.push(
    { id: id(), companyId: company.id, productId, type: 'in', quantity: 10, createdAt: date },
    { id: id(), companyId: company.id, productId, type: 'out', quantity: 3, createdAt: date },
  );
  const saleId = id();
  db.sales.push({ id: saleId, companyId: company.id, customerId, items: [{ productId, quantity: 2, unitPrice: 50 }], total: 100, status: 'confirmed', idempotencyKey: id(), createdAt: date });
  const purchaseId = id();
  db.purchases.push({ id: purchaseId, companyId: company.id, supplierId, items: [{ productId, quantity: 4, unitCost: 20 }], total: 80, status: 'received', idempotencyKey: id(), createdAt: date });
  db.financialTransactions.push(
    { id: id(), companyId: company.id, type: 'income', category: 'Venta', amount: 100, status: 'paid', createdAt: date },
    { id: id(), companyId: company.id, type: 'expense', category: 'Suministros', amount: 35, status: 'pending', reference: 'REF-1', createdAt: date },
  );

  const otherCompany: Company = { id: id(), name: 'Otra empresa', currency: 'EUR', enabledModules: ['reports'], createdAt: now() };
  db.companies.push(otherCompany);
  const otherUserId = id();
  db.users.push({ id: otherUserId, email: `${otherUserId}@example.test`, name: 'Otro usuario', passwordHash: '', createdAt: now() });
  db.memberships.push({ userId: otherUserId, companyId: otherCompany.id, role: 'owner' });
  const otherToken = issueToken(otherUserId, otherCompany.id, 'owner');
  db.sales.push({ id: id(), companyId: otherCompany.id, customerId: id(), items: [], total: 99000, status: 'confirmed', idempotencyKey: id(), createdAt: date });

  const salesUserId = id();
  db.users.push({ id: salesUserId, email: `${salesUserId}@example.test`, name: 'Ventas', passwordHash: '', createdAt: now() });
  db.memberships.push({ userId: salesUserId, companyId: company.id, role: 'sales' });
  const salesToken = issueToken(salesUserId, company.id, 'sales');
  const inventoryUserId = id();
  db.users.push({ id: inventoryUserId, email: `${inventoryUserId}@example.test`, name: 'Inventario', passwordHash: '', createdAt: now() });
  db.memberships.push({ userId: inventoryUserId, companyId: company.id, role: 'inventory' });
  const inventoryToken = issueToken(inventoryUserId, company.id, 'inventory');
  const viewerId = id();
  db.users.push({ id: viewerId, email: `${viewerId}@example.test`, name: 'Consulta', passwordHash: '', createdAt: now() });
  db.memberships.push({ userId: viewerId, companyId: company.id, role: 'viewer' });
  const viewerToken = issueToken(viewerId, company.id, 'viewer');

  const server = createApp().listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://localhost:${(server.address() as AddressInfo).port}/api/v1`;
  const call = (path: string, token: string, init: RequestInit = {}) => fetch(`${base}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
  });
  const period = '?from=2026-10-01&to=2026-10-31';
  try {
    assert.equal((await call('/reports/sales', viewerToken)).status, 403);
    assert.equal((await call('/reports/sales', salesToken)).status, 200);
    assert.equal((await call(`/reports/sales${period}`, inventoryToken)).status, 403);
    assert.equal((await call('/reports/customers', inventoryToken)).status, 403);
    assert.equal((await call('/reports/finance', salesToken)).status, 403);
    assert.equal((await call(`/reports/summary${period}`, salesToken)).status, 403);
    assert.equal((await call(`/reports/summary${period}`, inventoryToken)).status, 403);
    assert.equal((await call('/reports/export-audit', salesToken, { method: 'POST', body: JSON.stringify({ type: 'sales', format: 'pdf' }) })).status, 403);
    assert.equal((await call('/reports/export-audit', inventoryToken, { method: 'POST', body: JSON.stringify({ type: 'inventory', format: 'xlsx' }) })).status, 403);

    const options = await call('/reports/options', ownerToken);
    assert.equal(options.status, 200);
    const optionData = await options.json() as { company: { currency: string }; customers: { id: string }[]; suppliers: { id: string }[] };
    assert.equal(optionData.company.currency, company.currency);
    assert.deepEqual(optionData.customers.map(item => item.id), [customerId]);
    assert.deepEqual(optionData.suppliers.map(item => item.id), [supplierId]);
    const salesOptions = await call('/reports/options', salesToken);
    const salesOptionData = await salesOptions.json() as { customers: { id: string }[]; suppliers: { id: string }[] };
    assert.deepEqual(salesOptionData.customers.map(item => item.id), [customerId]);
    assert.deepEqual(salesOptionData.suppliers, []);
    const inventoryOptions = await call('/reports/options', inventoryToken);
    const inventoryOptionData = await inventoryOptions.json() as { customers: { id: string }[]; suppliers: { id: string }[] };
    assert.deepEqual(inventoryOptionData.customers, []);
    assert.deepEqual(inventoryOptionData.suppliers.map(item => item.id), [supplierId]);

    const salesResponse = await call(`/reports/sales${period}&customerId=${customerId}&status=confirmed`, ownerToken);
    const salesReport = await salesResponse.json() as { rows: { id: string; customer: string; items: { name: string }[] }[]; kpis: { key: string; value: number }[] };
    assert.equal(salesResponse.status, 200);
    assert.deepEqual(salesReport.rows.map(row => row.id), [saleId]);
    assert.equal(salesReport.rows[0]?.customer, customer.name);
    assert.equal(salesReport.rows[0]?.items[0]?.name, 'Producto de reporte');
    assert.equal(salesReport.kpis.find(item => item.key === 'salesTotal')?.value, 100);

    const crossTenantCustomer = await call(`/reports/sales${period}&customerId=${id()}`, ownerToken);
    assert.equal((await crossTenantCustomer.json() as { rows: unknown[] }).rows.length, 0);
    const purchases = await call(`/reports/purchases${period}&supplierId=${supplierId}&status=received`, ownerToken);
    assert.deepEqual((await purchases.json() as { rows: { id: string }[] }).rows.map(row => row.id), [purchaseId]);

    const inventory = await call(`/reports/inventory${period}&movementType=in`, ownerToken);
    const inventoryReport = await inventory.json() as { rows: { stock: number; entries: number; status: string }[]; kpis: { key: string; value: number }[] };
    assert.equal(inventoryReport.rows[0]?.stock, 7);
    assert.equal(inventoryReport.rows[0]?.entries, 10);
    assert.equal(inventoryReport.rows[0]?.status, 'Normal');
    assert.equal(inventoryReport.kpis.find(item => item.key === 'entries')?.value, 10);

    const finance = await call(`/reports/finance${period}&transactionType=income`, ownerToken);
    const financeReport = await finance.json() as { rows: { type: string }[]; kpis: { key: string; value: number }[] };
    assert.deepEqual(financeReport.rows.map(row => row.type), ['Ingreso']);
    assert.equal(financeReport.kpis.find(item => item.key === 'balance')?.value, 100);

    const customers = await call(`/reports/customers${period}&search=Pedro`, ownerToken);
    const customerReport = await customers.json() as { rows: { customer: string; salesCount: number; salesTotal: number }[] };
    assert.equal(customerReport.rows.length, 1);
    assert.deepEqual(customerReport.rows[0], { id: customerId, customer: customer.name, email: customer.email, phone: customer.phone, classification: customer.classification, salesCount: 1, salesTotal: 100 });

    const executive = await call(`/reports/summary${period}`, ownerToken);
    const executiveData = await executive.json() as { kpis: { salesTotal: number; purchasesTotal: number; income: number; expenses: number }; report: { type: string; rows: { metric: string; value: number }[] } };
    assert.equal(executiveData.report.type, 'executive');
    assert.equal(executiveData.kpis.salesTotal, 100);
    assert.equal(executiveData.kpis.purchasesTotal, 80);
    assert.equal(executiveData.kpis.income, 100);
    assert.equal(executiveData.kpis.expenses, 35);
    assert.equal(executiveData.report.rows.find(row => row.metric === 'Balance')?.value, 65);
    const timedSummary = await call('/reports/summary?from=2026-10-15T00:00:00.000Z&to=2026-10-15T23:59:59.999Z', ownerToken);
    assert.equal((await timedSummary.json() as { kpis: { salesTotal: number } }).kpis.salesTotal, 100);

    assert.equal((await call('/reports/sales?from=2026-02-30', ownerToken)).status, 400);
    assert.equal((await call('/reports/sales?from=2026-10-31&to=2026-10-01', ownerToken)).status, 400);
    assert.equal((await call('/reports/sales?status=cancelled', ownerToken)).status, 400);
    assert.equal((await call('/reports/inventory?companyId=other', ownerToken)).status, 400);
    assert.equal((await call('/reports/summary?from=2026-02-30', ownerToken)).status, 400);
    assert.equal((await call('/reports/summary?from=2026-10-31&to=2026-10-01', ownerToken)).status, 400);

    const exportAudit = await call('/reports/export-audit', ownerToken, {
      method: 'POST',
      body: JSON.stringify({ type: 'sales', format: 'pdf', filters: { from: '2026-10-01', to: '2026-10-31', customerId } }),
    });
    assert.equal(exportAudit.status, 201);
    assert.deepEqual(await exportAudit.json(), { recorded: true, rows: 1 });
    const auditLogs = await call('/audit-logs?action=report.export&module=reports', ownerToken);
    const exports = await auditLogs.json() as { action: string; entityId: string; metadata?: Record<string, unknown>; userId: string }[];
    const reportAudit = exports.find(item => item.action === 'report.export');
    assert.equal(reportAudit?.entityId, 'sales');
    assert.equal(reportAudit?.userId, owner.id);
    assert.equal(reportAudit?.metadata?.type, 'sales');
    assert.equal(reportAudit?.metadata?.format, 'pdf');
    assert.equal(reportAudit?.metadata?.rows, 1);
    assert.equal(reportAudit?.metadata?.customerId, undefined, 'Audit omits the sensitive customer identifier');

    const otherSales = await call(`/reports/sales${period}`, otherToken);
    const otherReport = await otherSales.json() as { rows: { total: number }[] };
    assert.deepEqual(otherReport.rows.map(row => row.total), [99000]);
  } finally {
    server.close();
  }
});
