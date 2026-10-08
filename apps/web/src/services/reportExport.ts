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

export type ReportExportColumn = { key: string; label: string; format?: 'currency' | 'date' | 'number' | 'text' };
export type ReportExportKpi = { key: string; label: string; value: number; format?: 'currency' | 'number' };
export type ReportExportInput = {
  type: string;
  title: string;
  companyName: string;
  currency: string;
  period: { from: string | null; to: string | null };
  filtersLabel: string;
  generatedAt: Date;
  columns: ReportExportColumn[];
  kpis: ReportExportKpi[];
  rows: Record<string, unknown>[];
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

function printableValue(value: unknown, format: ReportExportColumn['format'], currency: string): string {
  if (value == null || value === '') return '—';
  if (format === 'currency' && typeof value === 'number' && Number.isFinite(value)) return currencyFormatter(currency).format(value);
  if (format === 'number' && typeof value === 'number' && Number.isFinite(value)) return new Intl.NumberFormat('es-MX').format(value);
  if (format === 'date') {
    const parsed = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? '—' : formattedDate(parsed);
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(item => printableValue(item, 'text', currency)).join(', ');
  return '—';
}

function safeExcelValue(value: unknown, format: ReportExportColumn['format'], currency: string): string | number | boolean | Date {
  if (value instanceof Date) return value;
  if (format === 'date' && typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? spreadsheetText(value) : parsed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return spreadsheetText(value);
  if (Array.isArray(value)) return spreadsheetText(value.map(item => printableValue(item, 'text', currency)).join(', '));
  return value == null ? '' : spreadsheetText('—');
}

function reportCellFormat(row: Record<string, unknown>, column: ReportExportColumn): ReportExportColumn['format'] {
  if (column.key === 'value' && (row.format === 'currency' || row.format === 'number')) return row.format;
  return column.format;
}

function reportFileBase(type: string, generatedAt: Date): string {
  const slug = type.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filenameSlug = type === 'sales' ? 'ventas-fanix' : slug || 'fanix';
  const date = `${generatedAt.getFullYear()}-${String(generatedAt.getMonth() + 1).padStart(2, '0')}-${String(generatedAt.getDate()).padStart(2, '0')}`;
  return `reporte-${filenameSlug}-${date}`;
}

export function createReportPdf(report: ReportExportInput): Blob {
  const formatter = currencyFormatter(report.currency);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(27, 47, 76);
  doc.text('FANIX GLOBAL', margin, 17);
  doc.setFontSize(12);
  doc.text(report.title.toLocaleUpperCase('es-MX'), margin, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 87, 102);
  doc.text(`Empresa: ${report.companyName}`, margin, 33);
  doc.text(`Periodo: ${report.period.from ?? 'Sin límite'} - ${report.period.to ?? 'Sin límite'}`, margin, 39);
  const filterLines = doc.splitTextToSize(`Filtros: ${report.filtersLabel || 'Ninguno'}`, pageWidth - margin * 2);
  doc.text(filterLines, margin, 45);
  const generationY = 45 + filterLines.length * 4.5;
  doc.text(`Fecha de generación: ${formattedDate(report.generatedAt)}`, margin, generationY);
  let startY = generationY + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(27, 47, 76);
  doc.text('RESUMEN', margin, startY);
  autoTable(doc, {
    startY: startY + 3,
    margin: { left: margin, right: margin, bottom: 17 },
    head: [['Indicador', 'Valor']],
    body: report.kpis.map(kpi => [
      kpi.label,
      kpi.format === 'currency' ? formatter.format(kpi.value) : new Intl.NumberFormat('es-MX').format(kpi.value),
    ]),
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [27, 47, 76], textColor: [255, 255, 255] },
    columnStyles: { 0: { cellWidth: 75 }, 1: { halign: 'right' } },
  });
  const summaryBottom = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
  if (typeof summaryBottom !== 'number') throw new Error('No se pudo generar el resumen del PDF.');
  startY = summaryBottom + 10;
  if (startY > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    startY = margin;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(27, 47, 76);
  doc.text('DETALLE', margin, startY);
  autoTable(doc, {
    startY: startY + 3,
    margin: { top: margin, left: margin, right: margin, bottom: 17 },
    head: [report.columns.map(column => column.label)],
    body: report.rows.length
      ? report.rows.map(row => report.columns.map(column => printableValue(row[column.key], reportCellFormat(row, column), report.currency)))
      : [report.columns.map((_column, index) => index === 0 ? 'Sin registros para los filtros seleccionados.' : '')],
    theme: 'striped',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [27, 47, 76], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [242, 246, 250] },
  });
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 118, 128);
    doc.text('Fanix Global', margin, doc.internal.pageSize.getHeight() - 7);
    doc.text(`Generado: ${formattedDate(report.generatedAt)}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 7, { align: 'center' });
    doc.text(`Página ${page} de ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 7, { align: 'right' });
  }
  return doc.output('blob');
}

export function createReportExcel(report: ReportExportInput): ArrayBuffer {
  currencyFormatter(report.currency);
  const summaryRows: unknown[][] = [
    ['FANIX GLOBAL'],
    ['Reporte', report.title],
    ['Empresa', spreadsheetText(report.companyName)],
    ['Tipo de reporte', spreadsheetText(report.type)],
    ['Periodo', `${report.period.from ?? 'Sin límite'} - ${report.period.to ?? 'Sin límite'}`],
    ['Filtros', spreadsheetText(report.filtersLabel || 'Ninguno')],
    ['Fecha de generación', report.generatedAt],
    [],
    ['Indicador', 'Valor'],
    ...report.kpis.map(kpi => [spreadsheetText(kpi.label), kpi.value]),
  ];
  const summary = XLSX.utils.aoa_to_sheet(summaryRows);
  summary['!cols'] = [{ wch: 34 }, { wch: 48 }];
  for (let index = 0; index < report.kpis.length; index++) {
    const kpi = report.kpis[index]!;
    const cell = summary[XLSX.utils.encode_cell({ r: 9 + index, c: 1 })];
    if (cell && kpi.format === 'currency') cell.z = `#,##0.00 "${report.currency}"`;
    else if (cell) cell.z = '#,##0.##';
  }
  const detail = XLSX.utils.aoa_to_sheet([
    report.columns.map(column => spreadsheetText(column.label)),
    ...report.rows.map(row => report.columns.map(column => safeExcelValue(row[column.key], reportCellFormat(row, column), report.currency))),
  ]);
  detail['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(Math.max(report.columns.length - 1, 0))}${Math.max(report.rows.length + 1, 1)}` };
  detail['!cols'] = report.columns.map(column => {
    const longest = Math.max(column.label.length, ...report.rows.map(row => printableValue(row[column.key], reportCellFormat(row, column), report.currency).length));
    return { wch: Math.min(Math.max(longest + 2, 14), 48) };
  });
  for (let rowIndex = 0; rowIndex < report.rows.length; rowIndex++) {
    for (let columnIndex = 0; columnIndex < report.columns.length; columnIndex++) {
      const column = report.columns[columnIndex]!;
      const cell = detail[XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex })];
      if (!cell) continue;
      const format = reportCellFormat(report.rows[rowIndex]!, column);
      if (format === 'currency') cell.z = `#,##0.00 "${report.currency}"`;
      if (format === 'number') cell.z = '#,##0.##';
      if (format === 'date') cell.z = 'dd/mm/yyyy hh:mm';
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summary, 'Resumen');
  XLSX.utils.book_append_sheet(workbook, detail, report.type === 'sales' ? 'Ventas' : 'Detalle');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellStyles: true });
}

export function downloadReportFile(blob: Blob, type: string, format: 'pdf' | 'xlsx', generatedAt: Date): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('La descarga de reportes está disponible en la versión web de Fanix Global.');
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportFileBase(type, generatedAt)}.${format}`;
  link.style.display = 'none';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
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
