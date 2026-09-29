import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, getAllowedOrigins, isPublicRegistrationAllowed } from './app.js';
import { db } from './store.js';
import { getJwtSecret } from './auth.js';

async function runningApp() { const server = createApp().listen(0); await new Promise<void>(resolve => server.once('listening', () => resolve())); return server; }

test('production secrets fail fast without an explicit JWT secret', () => {
  assert.throws(() => getJwtSecret('production', {}), /JWT_SECRET/);
});
test('production requires a configured CORS origin list', () => {
  assert.throws(() => getAllowedOrigins('production', {}), /CORS_ORIGIN/);
});
test('health endpoint is public without exposing internal details', async () => { const server = await runningApp(); const response = await fetch(`http://localhost:${(server.address() as { port: number }).port}/api/v1/health`); const body = await response.json() as { status: string; service: string; persistence?: string }; assert.equal(response.status, 200); assert.equal(body.status, 'ok'); assert.equal(body.service, 'fanix-api'); assert.equal('persistence' in body, false); server.close(); });
test('public registration is disabled by default in production', () => {
  assert.equal(isPublicRegistrationAllowed({ NODE_ENV: 'production', ALLOW_PUBLIC_REGISTRATION: 'false' }), false);
  assert.equal(isPublicRegistrationAllowed({ NODE_ENV: 'development', ALLOW_PUBLIC_REGISTRATION: 'false' }), true);
  assert.equal(isPublicRegistrationAllowed({ NODE_ENV: 'production', ALLOW_PUBLIC_REGISTRATION: 'true' }), true);
});
test('protected data rejects missing token', async () => { const server = await runningApp(); const response = await fetch(`http://localhost:${(server.address() as { port: number }).port}/api/v1/customers`); assert.equal(response.status, 401); server.close(); });
test('login returns a public user and a company-scoped token', async () => { if (!db.users.length) await (await import('./store.js')).seedOwner(); const seededUser = db.users.find(user => user.email === 'admin@demo.local'); assert.ok(seededUser); const server = await runningApp(); const response = await fetch(`http://localhost:${(server.address() as { port: number }).port}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@demo.local', password: 'Admin123!' }) }); const body = await response.json() as { token: string; user: { id: string; name: string; email: string; passwordHash?: string }; company: { id: string } }; assert.equal(response.status, 200); assert.ok(body.token); assert.ok(body.company.id); assert.equal(body.user.passwordHash, undefined); assert.equal(body.user.id, seededUser.id); assert.equal(body.user.name, seededUser.name); assert.equal(body.user.email, seededUser.email); server.close(); });
test('register, refresh and /me expose only public user fields; refresh rotates and logout revokes', async () => {
	const server = await runningApp(); const base = `http://localhost:${(server.address() as { port: number }).port}/api/v1`;
	const email = `public-user-${Date.now()}@demo.local`;
	try {
	const registered = await fetch(`${base}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name: 'Public User', password: 'SecurePass123!', companyName: 'Public Company' }) });
	assert.equal(registered.status, 201); const registerBody = await registered.json() as { token: string; refreshToken: string; user: { id: string; name: string; email: string; passwordHash?: string }; company: { id: string } };
	assert.equal(registerBody.user.passwordHash, undefined); assert.equal(registerBody.user.name, 'Public User'); assert.equal(registerBody.user.email, email);
	const auth = { Authorization: `Bearer ${registerBody.token}` };
	const meResponse = await fetch(`${base}/me`, { headers: auth }); const meBody = await meResponse.json() as { user: { id: string; name: string; email: string; passwordHash?: string }; company: { id: string }; role: string };
	assert.equal(meResponse.status, 200); assert.equal(meBody.user.passwordHash, undefined); assert.deepEqual(meBody.user, { id: registerBody.user.id, name: 'Public User', email: registerBody.user.email }); assert.equal(meBody.company.id, registerBody.company.id); assert.equal(meBody.role, 'owner');
	const refreshResponse = await fetch(`${base}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: registerBody.refreshToken }) }); const refreshBody = await refreshResponse.json() as { token: string; refreshToken: string; user: { id: string; name: string; email: string; passwordHash?: string }; company: { id: string } };
	assert.equal(refreshResponse.status, 200); assert.equal(refreshBody.user.passwordHash, undefined); assert.deepEqual(refreshBody.user, meBody.user); assert.equal(refreshBody.company.id, registerBody.company.id); assert.notEqual(refreshBody.refreshToken, registerBody.refreshToken);
	const replayedRefresh = await fetch(`${base}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: registerBody.refreshToken }) }); assert.equal(replayedRefresh.status, 401);
	const logout = await fetch(`${base}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${refreshBody.token}` } }); assert.equal(logout.status, 200);
	const revokedRefresh = await fetch(`${base}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: refreshBody.refreshToken }) }); assert.equal(revokedRefresh.status, 401);
	} finally { server.close(); }
});
test('demo seed does not create users or companies in production', async () => {
	const users = [...db.users]; const companies = [...db.companies]; const memberships = [...db.memberships];
	try {
		db.users.length = 0; db.companies.length = 0; db.memberships.length = 0;
		await (await import('./store.js')).seedOwner({ NODE_ENV: 'production' });
		assert.equal(db.users.length, 0); assert.equal(db.companies.length, 0); assert.equal(db.memberships.length, 0);
	} finally {
		db.users.splice(0, db.users.length, ...users); db.companies.splice(0, db.companies.length, ...companies); db.memberships.splice(0, db.memberships.length, ...memberships);
	}
});
test('company data is isolated and critical inventory flow is idempotent', async () => {
	if (!db.users.length) await (await import('./store.js')).seedOwner();
	const server = await runningApp(); const base = `http://localhost:${(server.address() as { port: number }).port}/api/v1`;
	const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@demo.local', password: 'Admin123!' }) });
	const owner = await login.json() as { token: string; company: { id: string } }; const auth = { Authorization: `Bearer ${owner.token}`, 'Content-Type': 'application/json' };
	const second = await fetch(`${base}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `other-${Date.now()}@demo.local`, name: 'Otra empresa', password: 'Admin123!', companyName: 'Otra empresa' }) });
	const other = await second.json() as { token: string }; const otherCustomers = await fetch(`${base}/customers`, { headers: { Authorization: `Bearer ${other.token}` } }); assert.deepEqual(await otherCustomers.json(), []);
	const customerResponse = await fetch(`${base}/customers`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Cliente flujo' }) }); const customer = await customerResponse.json() as { id: string };
	const productResponse = await fetch(`${base}/products`, { method: 'POST', headers: auth, body: JSON.stringify({ sku: `SKU-${Date.now()}`, name: 'Producto flujo', price: 10, cost: 5, stockMinimum: 1 }) }); const product = await productResponse.json() as { id: string };
	const supplierResponse = await fetch(`${base}/suppliers`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Proveedor flujo' }) }); const supplier = await supplierResponse.json() as { id: string };
	const purchaseResponse = await fetch(`${base}/purchases`, { method: 'POST', headers: { ...auth, 'Idempotency-Key': `purchase-${Date.now()}` }, body: JSON.stringify({ supplierId: supplier.id, items: [{ productId: product.id, quantity: 3 }] }) }); const purchase = await purchaseResponse.json() as { id: string };
	await fetch(`${base}/purchases/${purchase.id}/approve`, { method: 'POST', headers: auth }); const received = await fetch(`${base}/purchases/${purchase.id}/receive`, { method: 'POST', headers: auth }); assert.equal(received.status, 200);
	const key = `sale-${Date.now()}`; const saleBody = JSON.stringify({ customerId: customer.id, items: [{ productId: product.id, quantity: 2 }] }); const firstSale = await fetch(`${base}/sales`, { method: 'POST', headers: { ...auth, 'Idempotency-Key': key }, body: saleBody }); const first = await firstSale.json() as { id: string };
	const retrySale = await fetch(`${base}/sales`, { method: 'POST', headers: { ...auth, 'Idempotency-Key': key }, body: saleBody }); const retry = await retrySale.json() as { id: string }; assert.equal(retrySale.status, 200); assert.equal(retry.id, first.id);
	const rejected = await fetch(`${base}/sales`, { method: 'POST', headers: { ...auth, 'Idempotency-Key': `over-${Date.now()}` }, body: JSON.stringify({ customerId: customer.id, items: [{ productId: product.id, quantity: 2 }] }) }); assert.equal(rejected.status, 409);
	server.close();
});
test('quotes, payments, documents and production are integrated', async () => {
	const server = await runningApp(); const base = `http://localhost:${(server.address() as { port: number }).port}/api/v1`;
	const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@demo.local', password: 'Admin123!' }) });
	const owner = await login.json() as { token: string; company: { id: string } }; const auth = { Authorization: `Bearer ${owner.token}`, 'Content-Type': 'application/json' };
	const customer = db.customers.find(item => item.companyId === owner.company.id); const product = db.products.find(item => item.companyId === owner.company.id); assert.ok(customer); assert.ok(product);
	const quoteResponse = await fetch(`${base}/quotes`, { method: 'POST', headers: auth, body: JSON.stringify({ customerId: customer.id, items: [{ productId: product.id, quantity: 1, unitPrice: 10 }], taxRate: 0.1 }) }); assert.equal(quoteResponse.status, 201);
	const sale = db.sales.find(item => item.companyId === owner.company.id); assert.ok(sale); const paymentKey = `payment-${Date.now()}`; const paymentBody = JSON.stringify({ type: 'sale', referenceId: sale.id, amount: sale.total, method: 'card' }); const paymentResponse = await fetch(`${base}/payments`, { method: 'POST', headers: { ...auth, 'Idempotency-Key': paymentKey }, body: paymentBody }); assert.equal(paymentResponse.status, 201); const paymentRetry = await fetch(`${base}/payments`, { method: 'POST', headers: { ...auth, 'Idempotency-Key': paymentKey }, body: paymentBody }); assert.equal(paymentRetry.status, 200);
	const upload = await fetch(`${base}/documents/upload`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'prueba.txt', category: 'qa', extension: 'txt', contentBase64: Buffer.from('ERP document').toString('base64') }) }); assert.equal(upload.status, 201); const document = await upload.json() as { id: string }; const download = await fetch(`${base}/documents/${document.id}/download`, { headers: { Authorization: `Bearer ${owner.token}` } }); assert.equal(download.status, 200); assert.equal(await download.text(), 'ERP document');
	await fetch(`${base}/company/modules`, { method: 'PATCH', headers: auth, body: JSON.stringify({ enabledModules: ['production', 'inventory', 'sales'] }) }); const rawResponse = await fetch(`${base}/products`, { method: 'POST', headers: auth, body: JSON.stringify({ sku: `RAW-${Date.now()}`, name: 'Materia prima QA', price: 1, cost: 1 }) }); const raw = await rawResponse.json() as { id: string }; const finishedResponse = await fetch(`${base}/products`, { method: 'POST', headers: auth, body: JSON.stringify({ sku: `FIN-${Date.now()}`, name: 'Producto terminado QA', price: 4, cost: 2 }) }); const finished = await finishedResponse.json() as { id: string }; await fetch(`${base}/inventory/movements`, { method: 'POST', headers: auth, body: JSON.stringify({ productId: raw.id, type: 'in', quantity: 2 }) }); await fetch(`${base}/production/boms`, { method: 'POST', headers: auth, body: JSON.stringify({ productId: finished.id, components: [{ productId: raw.id, quantity: 1 }] }) }); const orderResponse = await fetch(`${base}/production/orders`, { method: 'POST', headers: auth, body: JSON.stringify({ productId: finished.id, quantity: 2 }) }); const order = await orderResponse.json() as { id: string }; await fetch(`${base}/production/orders/${order.id}/start`, { method: 'POST', headers: auth }); const completed = await fetch(`${base}/production/orders/${order.id}/complete`, { method: 'POST', headers: auth }); assert.equal(completed.status, 200);
	server.close();
});
