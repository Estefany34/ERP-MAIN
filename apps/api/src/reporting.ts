import { z } from 'zod';
import { db } from './store.js';

export const reportTypes = ['sales', 'purchases', 'inventory', 'finance', 'customers', 'executive'] as const;
export type ReportType = typeof reportTypes[number];
export type ReportFormat = 'pdf' | 'xlsx';
export type ReportFilters = {
  from?: string;
  to?: string;
  status?: string;
  customerId?: string;
  supplierId?: string;
  transactionType?: 'income' | 'expense';
  movementType?: 'in' | 'out';
  search?: string;
};
export type ReportColumn = { key: string; label: string; format?: 'currency' | 'date' | 'number' | 'text' };
export type ReportKpi = { key: string; label: string; value: number; format?: 'currency' | 'number' };
export type ReportDefinition = {
  type: ReportType;
  title: string;
  company: { name: string; currency: string };
  period: { from: string | null; to: string | null };
  filters: ReportFilters;
  columns: ReportColumn[];
  kpis: ReportKpi[];
  rows: Record<string, unknown>[];
};

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'La fecha debe ser válida y usar el formato YYYY-MM-DD.');
const baseFiltersSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  status: z.string().trim().min(1).max(24).optional(),
  customerId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  transactionType: z.enum(['income', 'expense']).optional(),
  movementType: z.enum(['in', 'out']).optional(),
  search: z.string().trim().max(120).optional(),
}).strict().superRefine((filters, context) => {
  if (filters.from && filters.to && filters.from > filters.to) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'La fecha inicial no puede ser posterior a la fecha final.' });
  }
});

const allowedStatuses: Partial<Record<ReportType, string[]>> = {
  sales: ['confirmed'],
  purchases: ['draft', 'approved', 'received', 'rejected'],
  finance: ['pending', 'paid'],
};

export function parseReportFilters(type: ReportType, value: unknown): ReportFilters {
  const filters = baseFiltersSchema.parse(value);
  const issues: z.ZodIssue[] = [];
  const allow = (...keys: (keyof ReportFilters)[]) => {
    for (const key of Object.keys(filters) as (keyof ReportFilters)[]) {
      if (!keys.includes(key)) issues.push({ code: z.ZodIssueCode.custom, path: [key], message: `El filtro ${key} no aplica a este reporte.` });
    }
  };
  switch (type) {
    case 'sales':
      allow('from', 'to', 'status', 'customerId');
      if (filters.status && !allowedStatuses.sales?.includes(filters.status)) issues.push({ code: z.ZodIssueCode.custom, path: ['status'], message: 'Estado de venta inválido.' });
      break;
    case 'purchases':
      allow('from', 'to', 'status', 'supplierId');
      if (filters.status && !allowedStatuses.purchases?.includes(filters.status)) issues.push({ code: z.ZodIssueCode.custom, path: ['status'], message: 'Estado de compra inválido.' });
      break;
    case 'inventory':
      allow('from', 'to', 'movementType');
      break;
    case 'finance':
      allow('from', 'to', 'status', 'transactionType');
      if (filters.status && !allowedStatuses.finance?.includes(filters.status)) issues.push({ code: z.ZodIssueCode.custom, path: ['status'], message: 'Estado financiero inválido.' });
      break;
    case 'customers':
      allow('from', 'to', 'search');
      break;
    case 'executive':
      allow('from', 'to');
      break;
  }
  if (issues.length) throw new z.ZodError(issues);
  return filters;
}

export function parseReportType(value: unknown): ReportType {
  return z.enum(reportTypes).parse(value);
}

export const reportExportSchema = z.object({
  type: z.enum(reportTypes),
  format: z.enum(['pdf', 'xlsx']),
  filters: z.unknown().default({}),
}).strict();

function inPeriod(date: string, filters: ReportFilters): boolean {
  const instant = Date.parse(date);
  const from = filters.from ? Date.parse(filters.from.length === 10 ? `${filters.from}T00:00:00.000Z` : filters.from) : undefined;
  const to = filters.to ? Date.parse(filters.to.length === 10 ? `${filters.to}T23:59:59.999Z` : filters.to) : undefined;
  return Number.isFinite(instant) && (from === undefined || instant >= from) && (to === undefined || instant <= to);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function currencyKpi(key: string, label: string, value: number): ReportKpi {
  return { key, label, value, format: 'currency' };
}

function countKpi(key: string, label: string, value: number): ReportKpi {
  return { key, label, value, format: 'number' };
}

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    confirmed: 'Confirmada', draft: 'Borrador', approved: 'Aprobada',
    received: 'Recibida', rejected: 'Rechazada', pending: 'Pendiente',
    paid: 'Pagado', income: 'Ingreso', expense: 'Egreso', in: 'Entrada', out: 'Salida',
  };
  return labels[value] ?? value;
}

function stockFor(companyId: string, productId: string): number {
  return db.movements
    .filter(movement => movement.companyId === companyId && movement.productId === productId)
    .reduce((stock, movement) => stock + (movement.type === 'out' ? -movement.quantity : movement.quantity), 0);
}

function summarizeSales(companyId: string, filters: ReportFilters) {
  return db.sales.filter(sale =>
    sale.companyId === companyId &&
    inPeriod(sale.createdAt, filters) &&
    (!filters.status || sale.status === filters.status) &&
    (!filters.customerId || sale.customerId === filters.customerId)
  );
}

function summarizePurchases(companyId: string, filters: ReportFilters) {
  return db.purchases.filter(purchase =>
    purchase.companyId === companyId &&
    inPeriod(purchase.createdAt, filters) &&
    (!filters.status || purchase.status === filters.status) &&
    (!filters.supplierId || purchase.supplierId === filters.supplierId)
  );
}

function summarizeTransactions(companyId: string, filters: ReportFilters) {
  return db.financialTransactions.filter(transaction =>
    transaction.companyId === companyId &&
    inPeriod(transaction.createdAt, filters) &&
    (!filters.status || transaction.status === filters.status) &&
    (!filters.transactionType || transaction.type === filters.transactionType)
  );
}

function withinSummaryPeriod(date: string, from?: string, to?: string): boolean {
  return inPeriod(date, { from, to });
}

export function buildReportSummary(companyId: string, filters: Pick<ReportFilters, 'from' | 'to' | 'status'>) {
  const company = db.companies.find(candidate => candidate.id === companyId);
  if (!company) throw new Error('No se encontró la empresa de la sesión.');
  const sales = db.sales.filter(sale => sale.companyId === companyId && withinSummaryPeriod(sale.createdAt, filters.from, filters.to));
  const purchases = db.purchases.filter(purchase =>
    purchase.companyId === companyId &&
    withinSummaryPeriod(purchase.createdAt, filters.from, filters.to) &&
    (!filters.status || purchase.status === filters.status)
  );
  const transactions = db.financialTransactions.filter(transaction =>
    transaction.companyId === companyId &&
    withinSummaryPeriod(transaction.createdAt, filters.from, filters.to) &&
    (!filters.status || transaction.status === filters.status)
  );
  const products = db.products.filter(product => product.companyId === companyId);
  const stock = products.map(product => ({
    id: product.id,
    name: product.name,
    stock: stockFor(companyId, product.id),
    minimum: product.stockMinimum,
  }));
  const salesTotal = sum(sales.map(sale => sale.total));
  const purchasesTotal = sum(purchases.map(purchase => purchase.total));
  const income = sum(transactions.filter(transaction => transaction.type === 'income').map(transaction => transaction.amount));
  const expenses = sum(transactions.filter(transaction => transaction.type === 'expense').map(transaction => transaction.amount));
  const customerCount = db.customers.filter(customer => customer.companyId === companyId).length;
  const lowStock = stock.filter(item => item.stock <= item.minimum);
  const kpis = {
    customers: customerCount,
    salesCount: sales.length,
    salesTotal,
    purchasesCount: purchases.length,
    purchasesTotal,
    income,
    expenses,
    lowStock: lowStock.length,
  };
  const executiveKpis = [
    countKpi('salesCount', 'Ventas', kpis.salesCount),
    currencyKpi('salesTotal', 'Total vendido', kpis.salesTotal),
    countKpi('purchasesCount', 'Compras', kpis.purchasesCount),
    currencyKpi('purchasesTotal', 'Total comprado', kpis.purchasesTotal),
    currencyKpi('income', 'Ingresos', kpis.income),
    currencyKpi('expenses', 'Gastos', kpis.expenses),
    currencyKpi('balance', 'Balance', kpis.income - kpis.expenses),
    countKpi('customers', 'Clientes', kpis.customers),
    countKpi('products', 'Productos', products.length),
    countKpi('lowStock', 'Productos con stock bajo', kpis.lowStock),
  ];
  const executiveRows = [
    { metric: 'Ventas', value: kpis.salesCount, format: 'number' },
    { metric: 'Total vendido', value: kpis.salesTotal, format: 'currency' },
    { metric: 'Compras', value: kpis.purchasesCount, format: 'number' },
    { metric: 'Total comprado', value: kpis.purchasesTotal, format: 'currency' },
    { metric: 'Ingresos', value: kpis.income, format: 'currency' },
    { metric: 'Gastos', value: kpis.expenses, format: 'currency' },
    { metric: 'Balance', value: kpis.income - kpis.expenses, format: 'currency' },
    { metric: 'Clientes', value: kpis.customers, format: 'number' },
    { metric: 'Productos', value: products.length, format: 'number' },
    { metric: 'Productos con stock bajo', value: kpis.lowStock, format: 'number' },
  ];
  const executive: ReportDefinition = {
    type: 'executive',
    title: 'Reporte ejecutivo',
    company: { name: company.name, currency: company.currency },
    period: { from: filters.from ?? null, to: filters.to ?? null },
    filters: { from: filters.from, to: filters.to },
    columns: [{ key: 'metric', label: 'Indicador' }, { key: 'value', label: 'Valor', format: 'number' }],
    kpis: executiveKpis,
    rows: executiveRows,
  };
  return {
    period: { from: filters.from ?? null, to: filters.to ?? null },
    kpis,
    recent: {
      sales: sales.slice(-10).reverse(),
      purchases: purchases.slice(-10).reverse(),
      transactions: transactions.slice(-10).reverse(),
    },
    inventory: { lowStock },
    report: executive,
  };
}

function salesRows(companyId: string, filters: ReportFilters): Record<string, unknown>[] {
  return summarizeSales(companyId, filters).map(sale => {
    const customer = db.customers.find(candidate => candidate.id === sale.customerId && candidate.companyId === companyId);
    const products = sale.items.map(item => {
      const product = db.products.find(candidate => candidate.id === item.productId && candidate.companyId === companyId);
      return { name: product?.name ?? 'Producto no disponible', quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.quantity * item.unitPrice };
    });
    return {
      id: sale.id,
      date: sale.createdAt,
      customer: customer?.name ?? 'Cliente no disponible',
      status: statusLabel(sale.status),
      total: sale.total,
      products: products.map(item => `${item.name} × ${item.quantity}`).join(', '),
      items: products,
    };
  });
}

function purchaseRows(companyId: string, filters: ReportFilters): Record<string, unknown>[] {
  return summarizePurchases(companyId, filters).map(purchase => {
    const supplier = db.suppliers.find(candidate => candidate.id === purchase.supplierId && candidate.companyId === companyId);
    const products = purchase.items.map(item => {
      const product = db.products.find(candidate => candidate.id === item.productId && candidate.companyId === companyId);
      return { name: product?.name ?? 'Producto no disponible', quantity: item.quantity, unitCost: item.unitCost, subtotal: item.quantity * item.unitCost };
    });
    return {
      id: purchase.id,
      date: purchase.createdAt,
      supplier: supplier?.name ?? 'Proveedor no disponible',
      status: statusLabel(purchase.status),
      total: purchase.total,
      products: products.map(item => `${item.name} × ${item.quantity}`).join(', '),
      items: products,
    };
  });
}

function buildSales(companyId: string, filters: ReportFilters): Pick<ReportDefinition, 'title' | 'columns' | 'kpis' | 'rows'> {
  const sales = summarizeSales(companyId, filters);
  const total = sum(sales.map(sale => sale.total));
  return {
    title: 'Reporte de ventas',
    columns: [
      { key: 'id', label: 'ID interno' }, { key: 'date', label: 'Fecha', format: 'date' },
      { key: 'customer', label: 'Cliente' }, { key: 'status', label: 'Estado' },
      { key: 'total', label: 'Total', format: 'currency' }, { key: 'products', label: 'Productos' },
    ],
    kpis: [
      countKpi('salesCount', 'Ventas realizadas', sales.length),
      currencyKpi('salesTotal', 'Total vendido', total),
      currencyKpi('averageTicket', 'Ticket promedio', sales.length ? total / sales.length : 0),
      countKpi('confirmed', 'Confirmadas', sales.filter(sale => sale.status === 'confirmed').length),
    ],
    rows: salesRows(companyId, filters),
  };
}

function buildPurchases(companyId: string, filters: ReportFilters): Pick<ReportDefinition, 'title' | 'columns' | 'kpis' | 'rows'> {
  const purchases = summarizePurchases(companyId, filters);
  const total = sum(purchases.map(purchase => purchase.total));
  return {
    title: 'Reporte de compras',
    columns: [
      { key: 'id', label: 'ID interno' }, { key: 'date', label: 'Fecha', format: 'date' },
      { key: 'supplier', label: 'Proveedor' }, { key: 'status', label: 'Estado' },
      { key: 'total', label: 'Total', format: 'currency' }, { key: 'products', label: 'Productos' },
    ],
    kpis: [
      countKpi('purchasesCount', 'Compras realizadas', purchases.length),
      currencyKpi('purchasesTotal', 'Total comprado', total),
      currencyKpi('averagePurchase', 'Compra promedio', purchases.length ? total / purchases.length : 0),
      countKpi('pending', 'Pendientes', purchases.filter(purchase => purchase.status === 'draft').length),
      countKpi('approved', 'Aprobadas', purchases.filter(purchase => purchase.status === 'approved').length),
      countKpi('received', 'Recibidas', purchases.filter(purchase => purchase.status === 'received').length),
    ],
    rows: purchaseRows(companyId, filters),
  };
}

function buildInventory(companyId: string, filters: ReportFilters): Pick<ReportDefinition, 'title' | 'columns' | 'kpis' | 'rows'> {
  const products = db.products.filter(product => product.companyId === companyId);
  const movements = db.movements.filter(movement =>
    movement.companyId === companyId &&
    inPeriod(movement.createdAt, filters) &&
    (!filters.movementType || movement.type === filters.movementType)
  );
  const rows = products.map(product => {
    const stock = stockFor(companyId, product.id);
    const movementRows = movements.filter(movement => movement.productId === product.id);
    const state = stock <= 0 ? 'Sin existencias' : stock <= product.stockMinimum ? 'Stock bajo' : 'Normal';
    return {
      id: product.id, product: product.name, sku: product.sku, stock,
      minimum: product.stockMinimum, status: state,
      entries: sum(movementRows.filter(movement => movement.type === 'in').map(movement => movement.quantity)),
      exits: sum(movementRows.filter(movement => movement.type === 'out').map(movement => movement.quantity)),
    };
  });
  return {
    title: 'Reporte de inventario',
    columns: [
      { key: 'product', label: 'Producto' }, { key: 'sku', label: 'SKU' },
      { key: 'stock', label: 'Stock actual', format: 'number' },
      { key: 'minimum', label: 'Stock mínimo', format: 'number' },
      { key: 'status', label: 'Estado' }, { key: 'entries', label: 'Entradas', format: 'number' },
      { key: 'exits', label: 'Salidas', format: 'number' },
    ],
    kpis: [
      countKpi('products', 'Productos registrados', products.length),
      countKpi('availableUnits', 'Unidades disponibles', sum(rows.map(row => row.stock))),
      countKpi('lowStock', 'Productos con stock bajo', rows.filter(row => row.stock > 0 && row.stock <= row.minimum).length),
      countKpi('outOfStock', 'Sin existencias', rows.filter(row => row.stock <= 0).length),
      countKpi('entries', 'Entradas del periodo', sum(movements.filter(movement => movement.type === 'in').map(movement => movement.quantity))),
      countKpi('exits', 'Salidas del periodo', sum(movements.filter(movement => movement.type === 'out').map(movement => movement.quantity))),
    ],
    rows,
  };
}

function buildFinance(companyId: string, filters: ReportFilters): Pick<ReportDefinition, 'title' | 'columns' | 'kpis' | 'rows'> {
  const transactions = summarizeTransactions(companyId, filters);
  const income = sum(transactions.filter(transaction => transaction.type === 'income').map(transaction => transaction.amount));
  const expenses = sum(transactions.filter(transaction => transaction.type === 'expense').map(transaction => transaction.amount));
  const incomeCount = transactions.filter(transaction => transaction.type === 'income').length;
  const expenseCount = transactions.filter(transaction => transaction.type === 'expense').length;
  return {
    title: 'Reporte financiero',
    columns: [
      { key: 'date', label: 'Fecha', format: 'date' }, { key: 'type', label: 'Tipo' },
      { key: 'category', label: 'Categoría' }, { key: 'reference', label: 'Referencia' },
      { key: 'status', label: 'Estado' }, { key: 'amount', label: 'Monto', format: 'currency' },
    ],
    kpis: [
      currencyKpi('income', 'Ingresos', income), currencyKpi('expenses', 'Egresos', expenses),
      currencyKpi('balance', 'Balance', income - expenses),
      countKpi('transactions', 'Movimientos', transactions.length),
      currencyKpi('averageIncome', 'Ingreso promedio', incomeCount ? income / incomeCount : 0),
      currencyKpi('averageExpense', 'Egreso promedio', expenseCount ? expenses / expenseCount : 0),
    ],
    rows: transactions.map(transaction => ({
      id: transaction.id, date: transaction.createdAt, type: statusLabel(transaction.type),
      category: transaction.category, reference: transaction.reference ?? '—',
      status: statusLabel(transaction.status), amount: transaction.amount,
    })),
  };
}

function buildCustomers(companyId: string, filters: ReportFilters): Pick<ReportDefinition, 'title' | 'columns' | 'kpis' | 'rows'> {
  const sales = db.sales.filter(sale => sale.companyId === companyId && inPeriod(sale.createdAt, filters));
  const search = filters.search?.toLocaleLowerCase();
  const customers = db.customers.filter(customer =>
    customer.companyId === companyId &&
    inPeriod(customer.createdAt, filters) &&
    (!search || `${customer.name} ${customer.email ?? ''}`.toLocaleLowerCase().includes(search))
  );
  const rows = customers.map(customer => {
    const customerSales = sales.filter(sale => sale.customerId === customer.id);
    return {
      id: customer.id, customer: customer.name, email: customer.email ?? '—',
      phone: customer.phone ?? '—', classification: customer.classification ?? '—',
      salesCount: customerSales.length, salesTotal: sum(customerSales.map(sale => sale.total)),
    };
  });
  const active = rows.filter(row => row.salesCount > 0);
  return {
    title: 'Reporte de clientes',
    columns: [
      { key: 'customer', label: 'Cliente' }, { key: 'email', label: 'Correo' },
      { key: 'phone', label: 'Teléfono' }, { key: 'classification', label: 'Clasificación' },
      { key: 'salesCount', label: 'Ventas asociadas', format: 'number' },
      { key: 'salesTotal', label: 'Monto vendido', format: 'currency' },
    ],
    kpis: [
      countKpi('customers', 'Clientes registrados', rows.length),
      countKpi('activeCustomers', 'Clientes con actividad', active.length),
      countKpi('inactiveCustomers', 'Clientes sin actividad', rows.length - active.length),
      countKpi('salesCount', 'Ventas asociadas', sum(rows.map(row => row.salesCount))),
      currencyKpi('salesTotal', 'Total vendido', sum(rows.map(row => row.salesTotal))),
    ],
    rows,
  };
}

function buildExecutive(companyId: string, filters: ReportFilters): Pick<ReportDefinition, 'title' | 'columns' | 'kpis' | 'rows'> {
  const summary = buildReportSummary(companyId, { from: filters.from, to: filters.to });
  return { title: summary.report.title, columns: summary.report.columns, kpis: summary.report.kpis, rows: summary.report.rows };
}

export function buildReport(companyId: string, type: ReportType, rawFilters: unknown): ReportDefinition {
  const filters = parseReportFilters(type, rawFilters);
  const company = db.companies.find(candidate => candidate.id === companyId);
  if (!company) throw new Error('No se encontró la empresa de la sesión.');
  const data = {
    sales: () => buildSales(companyId, filters),
    purchases: () => buildPurchases(companyId, filters),
    inventory: () => buildInventory(companyId, filters),
    finance: () => buildFinance(companyId, filters),
    customers: () => buildCustomers(companyId, filters),
    executive: () => buildExecutive(companyId, filters),
  }[type]();
  return { type, company: { name: company.name, currency: company.currency }, period: { from: filters.from ?? null, to: filters.to ?? null }, filters, ...data };
}

export function reportOptions(companyId: string) {
  const company = db.companies.find(candidate => candidate.id === companyId);
  if (!company) throw new Error('No se encontró la empresa de la sesión.');
  return {
    company: { name: company.name, currency: company.currency },
    customers: db.customers.filter(customer => customer.companyId === companyId).map(({ id, name }) => ({ id, name })),
    suppliers: db.suppliers.filter(supplier => supplier.companyId === companyId).map(({ id, name }) => ({ id, name })),
  };
}

export function reportAuditMetadata(type: ReportType, format: ReportFormat, filters: ReportFilters, rows: number): Record<string, string | number | boolean> {
  return {
    type,
    format,
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.transactionType ? { transactionType: filters.transactionType } : {}),
    ...(filters.movementType ? { movementType: filters.movementType } : {}),
    ...(filters.customerId ? { customerFilter: true } : {}),
    ...(filters.supplierId ? { supplierFilter: true } : {}),
    ...(filters.search ? { searchApplied: true } : {}),
    rows,
  };
}
