import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import * as XLSX from '@e965/xlsx';
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

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function formattedDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function currencyFormatter(currency: string): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency });
  } catch {
    throw new Error('La moneda configurada para la empresa no es válida.');
  }
}

function roundAmount(amount: number, currency: string): number {
  const digits = currencyFormatter(currency).resolvedOptions().maximumFractionDigits ?? 2;
  const scale = 10 ** digits;
  return Math.round((amount + Number.EPSILON) * scale) / scale;
}

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

    return {
      id,
      customer,
      total: amount,
      status: (labels[statusValue] ?? statusValue) || 'Sin estado',
      date: dateValue,
      dateLabel: formattedDate(dateValue),
    };
  });
}

export function salesReportTotal(records: SalesReportRecord[], currency: string): number {
  return roundAmount(records.reduce((sum, record) => sum + record.total, 0), currency);
}

export function salesReportFilename(extension: 'pdf' | 'xlsx', generatedAt = new Date()): string {
  const year = generatedAt.getFullYear();
  const month = String(generatedAt.getMonth() + 1).padStart(2, '0');
  const day = String(generatedAt.getDate()).padStart(2, '0');
  return `reporte-ventas-fanix-${year}-${month}-${day}.${extension}`;
}

function moneyText(amount: number, currency: string): string {
  return currencyFormatter(currency).format(amount);
}

export function createSalesReportPdf(records: SalesReportRecord[], currency: string, generatedAt = new Date()): Blob {
  const formatter = currencyFormatter(currency);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(27, 47, 76);
  doc.text('FANIX GLOBAL', margin, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Reporte de ventas', margin, 25);
  doc.setFontSize(9);
  doc.setTextColor(90, 101, 115);
  doc.text(`Fecha de generación: ${formattedDate(generatedAt)}`, margin, 32);

  autoTable(doc, {
    startY: 39,
    margin: { top: margin, right: margin, bottom: 19, left: margin },
    head: [['ID', 'Cliente', 'Total', 'Estado', 'Fecha']],
    body: records.map(record => [
      record.id,
      record.customer,
      formatter.format(record.total),
      record.status,
      record.dateLabel,
    ]),
    theme: 'striped',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [27, 47, 76], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [242, 246, 250] },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 48 },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 28 },
      4: { cellWidth: 44 },
    },
  });

  const tableBottom = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
  if (typeof tableBottom !== 'number') throw new Error('No se pudo completar la tabla del reporte PDF.');
  const summaryNeedsNewPage = tableBottom + 18 > doc.internal.pageSize.getHeight() - margin;
  if (summaryNeedsNewPage) doc.addPage();
  const summaryY = summaryNeedsNewPage ? margin : tableBottom + 10;
  const total = salesReportTotal(records, currency);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(27, 47, 76);
  doc.text(`Total de registros: ${records.length}`, margin, summaryY);
  doc.text(`Monto total: ${moneyText(total, currency)}`, margin, summaryY + 6);

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 118, 128);
    doc.text(`Página ${page} de ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 7, { align: 'right' });
  }

  return doc.output('blob');
}

function spreadsheetText(value: string): string {
  return /^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? `'${value}` : value;
}

export function createSalesReportExcel(records: SalesReportRecord[], currency: string, generatedAt = new Date()): ArrayBuffer {
  currencyFormatter(currency);
  const total = salesReportTotal(records, currency);
  const headerRow = 4;
  const firstSaleRow = headerRow + 1;
  const summaryAmountRow = firstSaleRow + records.length + 3;
  const rows: unknown[][] = [
    ['FANIX GLOBAL'],
    ['Reporte de ventas'],
    ['Fecha de generación', formattedDate(generatedAt)],
    [],
    ['ID', 'Cliente', 'Total', 'Estado', 'Fecha'],
    ...records.map(record => [
      spreadsheetText(record.id),
      spreadsheetText(record.customer),
      record.total,
      spreadsheetText(record.status),
      record.date,
    ]),
    [],
    ['Resumen'],
    ['Total de registros', records.length],
    ['Monto total', total],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 24 }, { wch: 38 }, { wch: 18 }, { wch: 20 }, { wch: 23 }];
  sheet['!autofilter'] = { ref: `A${headerRow + 1}:E${headerRow + records.length + 1}` };

  for (let index = 0; index < records.length; index++) {
    const amountCell = sheet[XLSX.utils.encode_cell({ r: firstSaleRow + index, c: 2 })];
    const dateCell = sheet[XLSX.utils.encode_cell({ r: firstSaleRow + index, c: 4 })];
    if (amountCell) amountCell.z = `#,##0.00 "${currency}"`;
    if (dateCell) dateCell.z = 'dd/mm/yyyy hh:mm';
  }
  const summaryCell = sheet[XLSX.utils.encode_cell({ r: summaryAmountRow, c: 1 })];
  if (summaryCell) summaryCell.z = `#,##0.00 "${currency}"`;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Ventas');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
}

function assertBrowserDownload(): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('La descarga de reportes está disponible en la versión web de Fanix Global.');
  }
}

function downloadFile(blob: Blob, filename: string): void {
  assertBrowserDownload();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function downloadSalesReportPdf(records: SalesReportRecord[], currency: string): void {
  assertBrowserDownload();
  const generatedAt = new Date();
  downloadFile(createSalesReportPdf(records, currency, generatedAt), salesReportFilename('pdf', generatedAt));
}

export function downloadSalesReportExcel(records: SalesReportRecord[], currency: string): void {
  assertBrowserDownload();
  const generatedAt = new Date();
  const bytes = createSalesReportExcel(records, currency, generatedAt);
  downloadFile(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), salesReportFilename('xlsx', generatedAt));
}
