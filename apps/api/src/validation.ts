import { z } from 'zod';

const safeName = z.string().trim().min(2).max(120).regex(/^[\p{L}\p{M}0-9 .,'&()\-]+$/u, 'Contains invalid characters');
const safeShortText = (max: number) => z.string().trim().max(max).regex(/^[\p{L}\p{M}0-9 .,'&()_\-/#]*$/u, 'Contains invalid characters');
const phone = z.string().trim().min(7).max(20).regex(/^\+?[0-9 ()\-]+$/, 'Invalid phone number');
const sku = z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9._\-]+$/, 'Invalid SKU');

export const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(8) });
export const customerSchema = z.object({ name: safeName, email: z.string().trim().email().max(254).optional(), phone: phone.optional(), classification: safeShortText(40).optional() });
export const productSchema = z.object({ sku, name: safeName, price: z.number().nonnegative(), cost: z.number().nonnegative(), stockMinimum: z.number().int().nonnegative().default(0) });
export const saleSchema = z.object({ customerId: z.string().uuid(), items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive(), unitPrice: z.number().nonnegative().optional() })).min(1).refine(items => new Set(items.map(item => item.productId)).size === items.length, 'Each product must appear only once') });
export const supplierSchema = z.object({ name: safeName, email: z.string().trim().email().max(254).optional(), phone: phone.optional() });
export const purchaseSchema = z.object({ supplierId: z.string().uuid(), items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive(), unitCost: z.number().nonnegative().optional() })).min(1) });
export const employeeSchema = z.object({ name: safeName, email: z.string().trim().email().max(254).optional(), department: safeShortText(80).optional(), position: safeShortText(80).optional(), status: z.enum(['active', 'inactive']).default('active') });
export const projectSchema = z.object({ name: z.string().trim().min(2).max(120), customerId: z.string().uuid().optional(), ownerId: z.string().uuid(), startsOn: z.string().optional(), endsOn: z.string().optional() });
export const taskSchema = z.object({ title: z.string().trim().min(2).max(160), assigneeId: z.string().uuid().optional(), dueOn: z.string().optional() });
export const transactionSchema = z.object({ type: z.enum(['income', 'expense']), category: safeShortText(80).refine((value) => value.length >= 2, 'Too short'), amount: z.number().positive(), status: z.enum(['pending', 'paid']).default('pending'), reference: safeShortText(120).optional() });
export const documentSchema = z.object({ name: z.string().trim().min(1).max(160), category: z.string().trim().min(1).max(80), storageKey: z.string().trim().min(1).max(500), entity: z.string().max(80).optional(), entityId: z.string().uuid().optional() });
export const documentUploadSchema = z.object({ name: z.string().trim().min(1).max(160), category: z.string().trim().min(1).max(80), contentBase64: z.string().min(1), extension: z.string().max(10).optional(), entity: z.string().max(80).optional(), entityId: z.string().uuid().optional() });
export const incidentSchema = z.object({ title: safeShortText(160).refine((value) => value.length >= 2, 'Too short'), description: z.string().trim().max(2000).optional() });
export const productionSchema = z.object({ productId: z.string().uuid(), quantity: z.number().int().positive() });
export const quoteSchema = z.object({ customerId: z.string().uuid(), items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive(), unitPrice: z.number().nonnegative() })).min(1), taxRate: z.number().min(0).max(1).default(0) });
export const paymentSchema = z.object({ type: z.enum(['sale', 'purchase', 'income', 'expense']), referenceId: z.string().uuid(), amount: z.number().positive(), method: z.enum(['cash', 'bank_transfer', 'card', 'external']) });
export const branchSchema = z.object({ name: z.string().trim().min(2).max(120), address: z.string().max(240).optional(), active: z.boolean().default(true) });
export const warehouseSchema = z.object({ name: z.string().trim().min(2).max(120), branchId: z.string().uuid().optional() });
export const bomSchema = z.object({ productId: z.string().uuid(), components: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive() })).min(1).refine(items => new Set(items.map(item => item.productId)).size === items.length, 'Each component must appear only once') }).refine(bom => !bom.components.some(item => item.productId === bom.productId), 'A product cannot consume itself');
export const movementSchema = z.object({ productId: z.string().uuid(), type: z.enum(['in', 'out', 'adjustment']), quantity: z.number().int().positive() });
export const registerSchema = z.object({ email: z.string().trim().email(), name: z.string().trim().min(2).max(120), companyName: z.string().trim().min(2).max(120), password: z.string().min(8).max(72), planId: z.enum(['starter', 'professional', 'business']).default('starter'), billingCycle: z.enum(['monthly', 'annual']).default('monthly'), modules: z.array(z.enum(['crm','sales','inventory','purchases','finance','hr','projects','reports'])).max(8).optional(), industry: z.string().trim().max(80).optional(), employeeCount: z.number().int().min(1).max(1000000).optional(), country: z.string().trim().max(80).default('México'), taxId: z.string().trim().max(32).optional() });
