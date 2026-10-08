import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

export type Role = 'owner' | 'admin' | 'sales' | 'inventory' | 'viewer';
export type Company = { id: string; name: string; currency: string; enabledModules: string[]; industry?: string; employeeCount?: number; country?: string; taxId?: string; createdAt: string };
export type PlanId = 'starter' | 'professional' | 'business';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended';
export type Subscription = { id: string; companyId: string; planId: PlanId; status: SubscriptionStatus; billingCycle: 'monthly' | 'annual'; trialEndsAt?: string; currentPeriodEndsAt?: string; createdAt: string; updatedAt: string };
export type Invitation = { id: string; companyId: string; email: string; role: Role; token: string; status: 'pending' | 'accepted' | 'expired' | 'revoked'; expiresAt: string; createdBy: string; createdAt: string };
export type User = { id: string; email: string; name: string; passwordHash: string; createdAt: string };
export type PublicUser = Pick<User, 'id' | 'name' | 'email'>;
export const toPublicUser = (user: User): PublicUser => ({ id: user.id, name: user.name, email: user.email });
export type Membership = { userId: string; companyId: string; role: Role };
export type Session = { id: string; userId: string; companyId: string; role: Role; refreshTokenHash: string; revokedAt?: string; expiresAt: string; createdAt: string; lastUsedAt: string };
export type Customer = { id: string; companyId: string; name: string; email?: string; phone?: string; classification?: string; createdAt: string };
export type Product = { id: string; companyId: string; sku: string; name: string; price: number; cost: number; stockMinimum: number; createdAt: string };
export type InventoryMovement = { id: string; companyId: string; productId: string; type: 'in' | 'out' | 'adjustment'; quantity: number; reference?: string; idempotencyKey?: string; createdAt: string };
export type Sale = { id: string; companyId: string; customerId: string; items: { productId: string; quantity: number; unitPrice: number }[]; total: number; status: 'confirmed'; idempotencyKey: string; createdAt: string };
export type Quote = { id: string; companyId: string; customerId: string; items: { productId: string; quantity: number; unitPrice: number }[]; subtotal: number; tax: number; total: number; status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'; createdAt: string };
export type Payment = { id: string; companyId: string; type: 'sale' | 'purchase' | 'income' | 'expense'; referenceId: string; amount: number; method: 'cash' | 'bank_transfer' | 'card' | 'external'; status: 'pending' | 'completed' | 'failed'; idempotencyKey: string; createdAt: string };
export type Supplier = { id: string; companyId: string; name: string; email?: string; phone?: string; status: 'active' | 'inactive'; createdAt: string };
export type Purchase = { id: string; companyId: string; supplierId: string; items: { productId: string; quantity: number; unitCost: number }[]; total: number; status: 'draft' | 'approved' | 'received' | 'rejected'; idempotencyKey: string; createdAt: string };
export type AuditLog = { id: string; companyId: string; userId?: string; role?: Role; action: string; module?: string; entity: string; entityId: string; result?: 'success' | 'failure'; ip?: string; metadata?: Record<string, string | number | boolean>; createdAt: string };
export type Employee = { id: string; companyId: string; name: string; email?: string; department?: string; position?: string; status: 'active' | 'inactive'; createdAt: string };
export type Project = { id: string; companyId: string; name: string; customerId?: string; ownerId: string; status: 'planned' | 'active' | 'closed'; startsOn?: string; endsOn?: string; createdAt: string };
export type Task = { id: string; companyId: string; projectId: string; title: string; assigneeId?: string; status: 'todo' | 'in_progress' | 'done'; dueOn?: string; createdAt: string };
export type FinancialTransaction = { id: string; companyId: string; type: 'income' | 'expense'; category: string; amount: number; status: 'pending' | 'paid'; reference?: string; createdAt: string };
export type Notification = { id: string; companyId: string; userId?: string; type: string; message: string; readAt?: string; dedupeKey: string; createdAt: string };
export type Incident = { id: string; companyId: string; title: string; description?: string; status: 'open' | 'resolved'; createdBy: string; createdAt: string };
export type ProductionOrder = { id: string; companyId: string; productId: string; quantity: number; status: 'planned' | 'in_progress' | 'completed' | 'cancelled'; createdAt: string };
export type Branch = { id: string; companyId: string; name: string; address?: string; active: boolean; createdAt: string };
export type Warehouse = { id: string; companyId: string; branchId?: string; name: string; createdAt: string };
export type BillOfMaterial = { id: string; companyId: string; productId: string; components: { productId: string; quantity: number }[]; createdAt: string };

export const db = {
  companies: [] as Company[], users: [] as User[], memberships: [] as Membership[], sessions: [] as Session[], customers: [] as Customer[],
  products: [] as Product[], movements: [] as InventoryMovement[], sales: [] as Sale[], quotes: [] as Quote[], payments: [] as Payment[], suppliers: [] as Supplier[], purchases: [] as Purchase[], employees: [] as Employee[], projects: [] as Project[], tasks: [] as Task[], financialTransactions: [] as FinancialTransaction[], notifications: [] as Notification[], incidents: [] as Incident[], productionOrders: [] as ProductionOrder[], branches: [] as Branch[], warehouses: [] as Warehouse[], billsOfMaterial: [] as BillOfMaterial[], audits: [] as AuditLog[], subscriptions: [] as Subscription[], invitations: [] as Invitation[]
};

export async function seedOwner(env = process.env) {
  if (env.NODE_ENV === 'production') return;
  if (db.users.length > 0) return;
  const user: User = { id: randomUUID(), email: 'admin@demo.local', name: 'Administrador', passwordHash: await bcrypt.hash(env.DEMO_PASSWORD ?? 'Admin123!', 12), createdAt: new Date().toISOString() };
  const company: Company = { id: randomUUID(), name: 'Empresa demo', currency: 'USD', enabledModules: ['crm', 'sales', 'inventory', 'purchases', 'finance', 'hr', 'projects', 'reports'], createdAt: new Date().toISOString() };
  db.users.push(user); db.companies.push(company); db.memberships.push({ userId: user.id, companyId: company.id, role: 'owner' });
  db.subscriptions.push({ id: randomUUID(), companyId: company.id, planId: 'business', status: 'active', billingCycle: 'monthly', createdAt: now(), updatedAt: now() });
}

export const id = randomUUID;
export const now = () => new Date().toISOString();