import test from 'node:test';
import assert from 'node:assert/strict';
import { movementSchema, paymentSchema, projectSchema, purchaseSchema, quoteSchema, registerSchema } from './validation.js';

const uuidA = '11111111-1111-4111-8111-111111111111';
const uuidB = '22222222-2222-4222-8222-222222222222';

test('purchase and quote reject duplicate product lines', () => {
  assert.equal(purchaseSchema.safeParse({ supplierId: uuidA, items: [{ productId: uuidB, quantity: 1 }, { productId: uuidB, quantity: 2 }] }).success, false);
  assert.equal(quoteSchema.safeParse({ customerId: uuidA, items: [{ productId: uuidB, quantity: 1, unitPrice: 10 }, { productId: uuidB, quantity: 2, unitPrice: 10 }], taxRate: 0.16 }).success, false);
});

test('money and quantities reject unsafe values', () => {
  assert.equal(paymentSchema.safeParse({ type: 'sale', referenceId: uuidA, amount: Infinity, method: 'card' }).success, false);
  assert.equal(paymentSchema.safeParse({ type: 'sale', referenceId: uuidA, amount: 1_000_000_000, method: 'card' }).success, false);
  assert.equal(movementSchema.safeParse({ productId: uuidA, type: 'out', quantity: 0 }).success, false);
  assert.equal(movementSchema.safeParse({ productId: uuidA, type: 'adjustment', quantity: 1 }).success, false);
});

test('project dates are valid and ordered', () => {
  assert.equal(projectSchema.safeParse({ name: 'Proyecto QA', ownerId: uuidA, startsOn: '2026-10-10', endsOn: '2026-10-09' }).success, false);
  assert.equal(projectSchema.safeParse({ name: 'Proyecto QA', ownerId: uuidA, startsOn: '10/10/2026' }).success, false);
  assert.equal(projectSchema.safeParse({ name: 'Proyecto QA', ownerId: uuidA, startsOn: '2026-10-10', endsOn: '2026-10-10' }).success, true);
});

test('registration rejects duplicate modules and malformed tax ids', () => {
  const base = { email: 'qa@example.com', name: 'Usuario QA', companyName: 'Empresa QA', password: 'Secure123!', planId: 'starter' as const };
  assert.equal(registerSchema.safeParse({ ...base, modules: ['crm', 'crm'] }).success, false);
  assert.equal(registerSchema.safeParse({ ...base, taxId: '<script>' }).success, false);
});
