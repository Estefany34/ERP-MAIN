import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'apps/web/package.json'));
const temporary = await mkdtemp(path.join(tmpdir(), 'fanix-report-'));

try {
  const bundle = path.join(temporary, 'report-export.cjs');
  await build({
    entryPoints: [path.join(root, 'apps/web/src/services/reportExport.ts')],
    outfile: bundle,
    bundle: true,
    platform: 'node',
    format: 'cjs',
  });
  const {
    createSalesReportExcel,
    createSalesReportPdf,
    downloadSalesReportExcel,
    downloadSalesReportPdf,
    prepareSalesReport,
    salesReportFilename,
    salesReportTotal,
    createReportExcel,
    createReportPdf,
    downloadReportFile,
  } = require(bundle);
  const XLSX = require('@e965/xlsx');
  const generatedAt = new Date('2026-10-08T12:30:00.000Z');
  const customers = [{ id: 'customer-1', name: ('Cliente ' + 'con nombre muy largo '.repeat(14)).trim() }];
  const sales = Array.from({ length: 72 }, (_, index) => ({
    id: `sale-${String(index + 1).padStart(3, '0')}`,
    customerId: 'customer-1',
    total: index === 0 ? 10.25 : 10,
    status: index % 2 ? 'confirmed' : 'pending',
    createdAt: `2026-10-${String(index % 28 + 1).padStart(2, '0')}T12:30:00.000Z`,
  }));
  const records = prepareSalesReport(sales, customers);
  assert.equal(records.length, 72);
  assert.equal(records[0].customer, customers[0].name);
  assert.equal(records[0].status, 'Pendiente');
  assert.equal(typeof records[0].dateLabel, 'string');
  assert.ok(!JSON.stringify(records).includes('[object Object]'));
  assert.equal(salesReportTotal(records, 'MXN'), 720.25);
  assert.equal(salesReportFilename('pdf', generatedAt), 'reporte-ventas-fanix-2026-10-08.pdf');
  assert.equal(salesReportFilename('xlsx', generatedAt), 'reporte-ventas-fanix-2026-10-08.xlsx');

  const pdf = createSalesReportPdf(records, 'MXN', generatedAt);
  const pdfBytes = new Uint8Array(await pdf.arrayBuffer());
  const pdfText = new TextDecoder().decode(pdfBytes);
  assert.ok(pdfText.startsWith('%PDF-'), 'PDF output has a PDF signature');
  assert.ok(pdfText.includes('%%EOF'), 'PDF output has a valid end marker');
  assert.ok(pdfText.includes('FANIX GLOBAL') && pdfText.includes('Reporte de ventas'));
  assert.ok(pdfText.includes('Total de registros: 72') && pdfText.includes('Monto total:'));
  assert.ok((pdfText.match(/\/Type\s*\/Page\b/g) ?? []).length > 1, 'Long report spans multiple PDF pages');
  for (const record of records) assert.ok(pdfText.includes(record.id), `PDF contains ${record.id}`);

  const excel = createSalesReportExcel(records, 'MXN', generatedAt);
  const excelBytes = new Uint8Array(excel);
  assert.ok(excelBytes[0] === 0x50 && excelBytes[1] === 0x4b, 'XLSX output is a ZIP-based workbook');
  const workbook = XLSX.read(excel, { type: 'array', cellDates: true, cellNF: true, cellStyles: true });
  assert.deepEqual(workbook.SheetNames, ['Ventas']);
  const sheet = workbook.Sheets.Ventas;
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
  assert.deepEqual(rows[4], ['ID', 'Cliente', 'Total', 'Estado', 'Fecha']);
  assert.equal(rows.filter(row => String(row[0] ?? '').startsWith('sale-')).length, 72);
  assert.equal(rows[5][2], 10.25, 'Sale amounts stay numeric');
  assert.equal(rows[5][1], customers[0].name);
  assert.ok(rows[5][4] instanceof Date, 'Dates are stored as Excel dates');
  assert.ok(sheet['!cols'][1].wch >= 38, 'Long customer names have a readable column width');
  const summaryRow = rows.find(row => row[0] === 'Monto total');
  assert.equal(summaryRow[1], 720.25);
  assert.ok(sheet['C6'].z.includes('MXN'), 'Excel monetary cells retain the company currency');

  const one = prepareSalesReport([sales[0]], customers);
  assert.equal(one.length, 1);
  assert.equal(salesReportTotal(one, 'MXN'), 10.25);
  const empty = prepareSalesReport([], customers);
  assert.equal(empty.length, 0);
  assert.equal(salesReportTotal(empty, 'MXN'), 0);
  assert.ok((await createSalesReportPdf(empty, 'MXN', generatedAt).arrayBuffer()).byteLength > 0);
  const emptyWorkbook = XLSX.read(createSalesReportExcel(empty, 'MXN', generatedAt), { type: 'array' });
  const emptySummary = XLSX.utils.sheet_to_json(emptyWorkbook.Sheets.Ventas, { header: 1, raw: true }).find(row => row[0] === 'Total de registros');
  assert.equal(emptySummary[1], 0);
  assert.throws(() => prepareSalesReport([{ ...sales[0], total: 'invalid' }], customers), /total inválido/);
  assert.throws(() => createSalesReportPdf(records, 'INVALID', generatedAt), /moneda configurada/);
  const formulaRecords = prepareSalesReport([{ ...sales[0], id: '=1+1', customerId: 'customer-formula' }], [...customers, { id: 'customer-formula', name: '=1+1' }]);
  const formulaWorkbook = XLSX.read(createSalesReportExcel(formulaRecords, 'MXN', generatedAt), { type: 'array' });
  const formulaValues = XLSX.utils.sheet_to_json(formulaWorkbook.Sheets.Ventas, { header: 1, raw: true })[5];
  assert.equal(formulaValues[0], "'=1+1");
  assert.equal(formulaValues[1], "'=1+1");
  assert.throws(() => downloadSalesReportPdf(one, 'MXN'), /disponible en la versión web/);

  const genericRows = records.map(record => ({
    id: record.id,
    customer: record.customer,
    total: record.total,
    status: record.status,
    date: record.date,
  }));
  const genericInput = {
    type: 'sales',
    title: 'Reporte de ventas',
    companyName: 'Fanix Global',
    currency: 'MXN',
    period: { from: '2026-10-01', to: '2026-10-31' },
    filtersLabel: 'Periodo: 01/10/2026 - 31/10/2026',
    generatedAt,
    columns: [
      { key: 'id', label: 'ID', format: 'text' },
      { key: 'customer', label: 'Cliente', format: 'text' },
      { key: 'total', label: 'Total', format: 'currency' },
      { key: 'status', label: 'Estado', format: 'text' },
      { key: 'date', label: 'Fecha', format: 'date' },
    ],
    kpis: [{ key: 'salesTotal', label: 'Total vendido', value: 720.25, format: 'currency' }],
    rows: genericRows,
  };
  const genericPdf = createReportPdf(genericInput);
  const genericPdfText = new TextDecoder().decode(new Uint8Array(await genericPdf.arrayBuffer()));
  assert.ok(genericPdfText.startsWith('%PDF-') && genericPdfText.includes('FANIX GLOBAL'));
  for (const row of genericRows) assert.ok(genericPdfText.includes(row.id), `Generic PDF contains ${row.id}`);
  const genericExcel = createReportExcel(genericInput);
  const genericExcelBytes = new Uint8Array(genericExcel);
  assert.ok(genericExcelBytes[0] === 0x50 && genericExcelBytes[1] === 0x4b);
  const genericWorkbook = XLSX.read(genericExcel, { type: 'array', cellDates: true, cellNF: true });
  assert.deepEqual(genericWorkbook.SheetNames, ['Resumen', 'Ventas']);
  const genericDetail = XLSX.utils.sheet_to_json(genericWorkbook.Sheets.Ventas, { header: 1, raw: true });
  assert.deepEqual(genericDetail.slice(1).map(row => row[0]), genericRows.map(row => row.id));
  assert.equal(genericDetail[1][2], genericRows[0].total);
  assert.ok(genericWorkbook.Sheets.Ventas['C2'].z.includes('MXN'));
  assert.ok(genericDetail[1][4] instanceof Date);
  const genericSummary = XLSX.utils.sheet_to_json(genericWorkbook.Sheets.Resumen, { header: 1, raw: true });
  assert.equal(genericSummary.find(row => row[0] === 'Total vendido')[1], 720.25);
  assert.ok(genericWorkbook.Sheets.Resumen['B10'].z.includes('MXN'));
  const unsafeWorkbook = XLSX.read(createReportExcel({
    ...genericInput,
    companyName: '=HYPERLINK("https://example.test")',
    rows: [{ ...genericRows[0], id: '=1+1', customer: '=2+2' }],
  }), { type: 'array' });
  const unsafeDetail = XLSX.utils.sheet_to_json(unsafeWorkbook.Sheets.Ventas, { header: 1, raw: true });
  assert.equal(unsafeDetail[1][0], "'=1+1");
  assert.equal(unsafeDetail[1][1], "'=2+2");
  assert.equal(XLSX.utils.sheet_to_json(unsafeWorkbook.Sheets.Resumen, { header: 1, raw: true })[2][1], "'=HYPERLINK(\"https://example.test\")");

  const executiveInput = {
    ...genericInput,
    type: 'executive',
    title: 'Reporte ejecutivo',
    columns: [{ key: 'metric', label: 'Indicador' }, { key: 'value', label: 'Valor', format: 'number' }],
    kpis: [{ key: 'balance', label: 'Balance', value: 65, format: 'currency' }],
    rows: [{ metric: 'Balance', value: 65, format: 'currency' }],
  };
  const executiveWorkbook = XLSX.read(createReportExcel(executiveInput), { type: 'array', cellNF: true });
  assert.equal(executiveWorkbook.Sheets.Detalle['B2'].v, 65);
  assert.ok(executiveWorkbook.Sheets.Detalle['B2'].z.includes('MXN'), 'Executive currency values stay numeric and use the company currency format');
  const emptyGenericWorkbook = XLSX.read(createReportExcel({ ...genericInput, rows: [] }), { type: 'array' });
  assert.deepEqual(XLSX.utils.sheet_to_json(emptyGenericWorkbook.Sheets.Ventas, { header: 1, raw: true }), [['ID', 'Cliente', 'Total', 'Estado', 'Fecha']]);

  const originalDocument = globalThis.document;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const downloads = [];
  URL.createObjectURL = blob => { downloads.push({ blob }); return `blob:fanix-${downloads.length}`; };
  URL.revokeObjectURL = () => {};
  globalThis.document = {
    body: { appendChild(link) { link.parent = this; } },
    createElement() {
      return {
        style: {},
        click() { downloads.at(-1).filename = this.download; },
        remove() {},
      };
    },
  };
  try {
    downloadSalesReportPdf(one, 'MXN');
    downloadSalesReportExcel(one, 'MXN');
    downloadReportFile(createReportPdf({ ...genericInput, rows: genericRows.slice(0, 1) }), 'sales', 'pdf', generatedAt);
    downloadReportFile(new Blob([createReportExcel({ ...genericInput, rows: genericRows.slice(0, 1) })]), 'sales', 'xlsx', generatedAt);
    assert.match(downloads[0].filename, /\.pdf$/);
    assert.match(downloads[1].filename, /\.xlsx$/);
    assert.ok(new TextDecoder().decode(await downloads[0].blob.arrayBuffer()).startsWith('%PDF-'));
    const downloadedWorkbook = XLSX.read(await downloads[1].blob.arrayBuffer(), { type: 'array' });
    assert.deepEqual(downloadedWorkbook.SheetNames, ['Ventas']);
    assert.match(downloads[2].filename, /\.pdf$/);
    assert.match(downloads[3].filename, /\.xlsx$/);
    assert.ok(new TextDecoder().decode(await downloads[2].blob.arrayBuffer()).startsWith('%PDF-'));
    assert.deepEqual(XLSX.read(await downloads[3].blob.arrayBuffer(), { type: 'array' }).SheetNames, ['Resumen', 'Ventas']);
    assert.equal(downloads[2].filename, 'reporte-ventas-fanix-2026-10-08.pdf');
    assert.equal(downloads[3].filename, 'reporte-ventas-fanix-2026-10-08.xlsx');
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  }

  console.log('PASS: zero/one/multiple sales, long customer names, normalized dates/statuses, totals, multipage PDF, generic report parity, executive currency, numeric/date XLSX cells, formula-safe text and actual .pdf/.xlsx downloads.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
