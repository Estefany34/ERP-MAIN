import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from './app.js';
import { db, id, now, seedOwner, type Company } from './store.js';
import { issueToken } from './auth.js';

test('RBAC reports, audit and tenant isolation are enforced by API', async () => {
  await seedOwner();
  const company = db.companies[0]!;
  const owner = db.users[0]!;
  if (!company.enabledModules.includes('reports')) company.enabledModules.push('reports');
  const ownerToken = issueToken(owner.id, company.id, 'owner');
  const viewerId = id();
  db.users.push({ id: viewerId, email: `viewer-${viewerId}@qa.local`, name: 'Viewer', passwordHash: '', createdAt: now() });
  db.memberships.push({ userId: viewerId, companyId: company.id, role: 'viewer' });
  const viewerToken = issueToken(viewerId, company.id, 'viewer');
  const otherCompany: Company = { id: id(), name: 'Tenant B', currency: 'MXN', enabledModules: ['reports'], createdAt: now() };
  db.companies.push(otherCompany);
  const otherId = id();
  db.users.push({ id: otherId, email: `other-${otherId}@qa.local`, name: 'Other', passwordHash: '', createdAt: now() });
  db.memberships.push({ userId: otherId, companyId: otherCompany.id, role: 'owner' });
  const otherToken = issueToken(otherId, otherCompany.id, 'owner');
  db.sales.push({ id: id(), companyId: company.id, customerId: id(), items: [], total: 100, status: 'confirmed', idempotencyKey: id(), createdAt: now() });
  db.sales.push({ id: id(), companyId: otherCompany.id, customerId: id(), items: [], total: 9999, status: 'confirmed', idempotencyKey: id(), createdAt: now() });
  const server = createApp().listen(0);
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address() as AddressInfo;
  const base = `http://localhost:${address.port}/api/v1`;
  const call = (path: string, token: string, init: RequestInit = {}) => fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) } });
  try {
    assert.equal((await call('/reports/summary', viewerToken)).status, 403);
    const summary = await call('/reports/summary', ownerToken); assert.equal(summary.status, 200); const body = await summary.json() as any; assert.equal(body.kpis.salesTotal, 100);
    assert.equal((await call('/reports/export.csv', viewerToken)).status, 403);
    const exported = await call('/reports/export.csv', ownerToken); assert.equal(exported.status, 200); assert.match(await exported.text(), /100/);
    const logs = await call('/audit-logs', ownerToken); assert.equal(logs.status, 200); const auditBody = await logs.json() as any[]; assert.ok(auditBody.some(x => x.action === 'report.export'));
    assert.equal((await call('/audit-logs', viewerToken)).status, 403);
    const otherSummary = await call('/reports/summary', otherToken); const otherBody = await otherSummary.json() as any; assert.equal(otherBody.kpis.salesTotal, 9999);
    assert.equal((await call(`/company/users/${owner.id}/role`, ownerToken, { method: 'PATCH', body: JSON.stringify({ role: 'viewer' }) })).status, 403);
    assert.equal((await call(`/company/users/${viewerId}/role`, ownerToken, { method: 'PATCH', body: JSON.stringify({ role: 'sales' }) })).status, 200);
  } finally {
    server.close();
  }
});
