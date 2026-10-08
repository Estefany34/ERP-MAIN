import { labels } from '../modules/config';

export type SalesReportRecord = {
  id: string;
  customer: string;
  total: number;
  status: string;
  date: Date;
  dateLabel: string;
};

type UnknownRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const stringValue = (value: unknown): string => typeof value === 'string' ? value.trim() : (typeof value === 'number' && Number.isFinite(value) ? String(value) : '');
const formattedDate = (date: Date): string => new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(date);

export function prepareSalesReport(sales: unknown[], customers: unknown[]): SalesReportRecord[] {
  const customerNames = new Map<string, string>();
  for (const customer of customers) {
    if (!isRecord(customer)) continue;
    const id = stringValue(customer.id);
    const name = stringValue(customer.name);
    if (id && name) customerNames.set(id, name);
  }
  return sales.map((sale, index) => {
    if (!isRecord(sale)) throw new Error(`No se pudo preparar el reporte: la venta ${index + 1} tiene un formato inválido.`);
    const id = stringValue(sale.id);
    const amount = typeof sale.total === 'number' || typeof sale.total === 'string' ? Number(sale.total) : Number.NaN;
    const dateValue = sale.createdAt instanceof Date ? sale.createdAt : new Date(stringValue(sale.createdAt));
    const statusValue = stringValue(sale.status);
    const customerId = stringValue(sale.customerId);
    const nestedCustomer = isRecord(sale.customer) ? stringValue(sale.customer.name) : '';
    const customer = customerNames.get(customerId) || nestedCustomer || stringValue(sale.customerName) || 'Cliente no disponible';
    if (!id) throw new Error(`No se pudo preparar el reporte: la venta ${index + 1} no tiene ID.`);
    if (!Number.isFinite(amount)) throw new Error(`No se pudo preparar el reporte: la venta ${id} tiene un total inválido.`);
    if (!Number.isFinite(dateValue.getTime())) throw new Error(`No se pudo preparar el reporte: la venta ${id} tiene una fecha inválida.`);
    return { id, customer, total: amount, status: (labels[statusValue] ?? statusValue) || 'Sin estado', date: dateValue, dateLabel: formattedDate(dateValue) };
  });
}

const webOnly = (): never => { throw new Error('La descarga de reportes PDF y Excel está disponible en la versión web de Fanix Global.'); };
export function downloadSalesReportPdf(_records: SalesReportRecord[], _currency: string): void { webOnly(); }
export function downloadSalesReportExcel(_records: SalesReportRecord[], _currency: string): void { webOnly(); }
