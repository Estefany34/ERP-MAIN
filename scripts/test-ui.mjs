// Component integration tests: real API, simulated React Native host components.
// These tests exercise callbacks and state; physical-device/layout QA is separate.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'apps/web/package.json'));
const React = require('react');
const { create, act } = require('react-test-renderer');
const { build } = require('esbuild');
const { createApp } = await import('../apps/api/dist/app.js');
const { seedOwner, db } = await import('../apps/api/dist/store.js');
await seedOwner();
const server = createApp().listen(0);
await new Promise(resolve => server.once('listening', resolve));
const api = `http://localhost:${server.address().port}/api/v1`;
const temporary = await mkdtemp(path.join(tmpdir(), 'fanix-ui-'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.__qaWidth = 1280;
const nativeStub = `import React from 'react';
  const host = name => props => React.createElement(name, props, props.children);
  export const View=host('View'), Text=host('Text'), TextInput=host('TextInput'), Pressable=host('Pressable'), SafeAreaView=host('SafeAreaView'), ScrollView=host('ScrollView'), KeyboardAvoidingView=host('KeyboardAvoidingView'), Image=host('Image'), ActivityIndicator=host('ActivityIndicator');
  export const StyleSheet={create: v=>v, absoluteFillObject: {}, flatten: v=>v};
  export const Platform={OS:'android',select: v=>v.android??v.default};
  export const BackHandler={addEventListener:()=>({remove(){}})};
  export const Share={share:async()=>({action:'sharedAction'})};
  export const useWindowDimensions=()=>({width:globalThis.__qaWidth,height:800});
  export const useColorScheme=()=> 'light';`;
let renderer;
try {
  await build({ entryPoints: [path.join(root, 'apps/web/App.tsx')], outfile: path.join(temporary, 'ui.cjs'), bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', define: { __DEV__: 'false', 'process.env.EXPO_PUBLIC_API_URL': JSON.stringify(api) }, loader: { '.png': 'dataurl' }, plugins: [{ name: 'native-test-host', setup(builder) {
    builder.onResolve({ filter: /^react($|\/)/ }, args => ({ path: require.resolve(args.path), external: true }));
    builder.onResolve({ filter: /^(react-native|expo-linear-gradient|@react-native-async-storage\/async-storage)$/ }, args => ({ path: args.path, namespace: 'mock' }));
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: args.path === 'react-native' ? nativeStub : args.path === 'expo-linear-gradient' ? `import React from 'react'; export const LinearGradient=props=>React.createElement('Gradient',props,props.children);` : `const saved=new Map(); export default {getItem:async k=>saved.get(k)??null,setItem:async(k,v)=>saved.set(k,v),multiGet:async keys=>keys.map(k=>[k,saved.get(k)??null]),multiSet:async pairs=>pairs.forEach(([k,v])=>saved.set(k,v)),multiRemove:async keys=>keys.forEach(k=>saved.delete(k))};`, loader: 'js', resolveDir: root }));
  } }] });
  const App = require(path.join(temporary, 'ui.cjs')).default;
  function text(node) { return typeof node === 'string' ? node : node.children?.map(text).join('') ?? ''; }
  const content = () => text(renderer.root);
  function buttons(label) { return renderer.root.findAll(node => node.type === 'Pressable' && text(node) === label); }
  async function press(label) { const found = buttons(label); assert.equal(found.length, 1, `One button: ${label}`); assert.ok(!found[0].props.disabled, `${label} is enabled`); await act(async () => { await found[0].props.onPress(); }); }
  async function fill(label, value) { const input = renderer.root.findAll(node => node.type === 'TextInput' && node.props.accessibilityLabel === label); assert.equal(input.length, 1, `One field: ${label}`); await act(async () => input[0].props.onChangeText(value)); }
  async function until(predicate, label) { for (let attempt = 0; attempt < 150; attempt++) { if (predicate()) return; await act(async () => { await delay(20); }); } assert.fail(`Timed out: ${label}\n${content()}`); }
  await act(async () => { renderer = create(React.createElement(App)); });
  await until(() => buttons('Iniciar sesión').length, 'Landing page');
  await press('Iniciar sesión');
  await until(() => renderer.root.findAll(node => node.type === 'TextInput' && node.props.accessibilityLabel === 'Correo electrónico').length === 1, 'Login form');
  await press('Iniciar sesión'); assert.ok(content().includes('Escribe un correo'));
  await fill('Correo electrónico', ' ADMIN@DEMO.LOCAL '); await fill('Contraseña', 'Admin123!');
  await press('Iniciar sesión'); await until(() => content().includes('Empresa demo'), 'Login/dashboard');
  assert.ok(content().includes('Administrador · Propietario'));
  await press('Clientes'); await until(() => buttons('Nuevo registro').length && !buttons('Actualizar')[0].props.disabled, 'Customers loaded');
  const actualFetch = globalThis.fetch;
  let expiredOnce = true;
  let refreshCount = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/auth/refresh')) refreshCount++;
    if (String(url) === `${api}/customers` && (!init.method || init.method === 'GET') && expiredOnce) { expiredOnce = false; return new Response(JSON.stringify({ error: { code: 'INVALID_TOKEN' } }), { status: 401 }); }
    return actualFetch(url, init);
  };
  await press('Actualizar'); await until(() => !buttons('Actualizar')[0].props.disabled, 'Refresh and retry');
  assert.equal(refreshCount, 1);
  globalThis.fetch = actualFetch;
  await press('Nuevo registro'); await fill('Nombre', 'Cliente desde UI'); await fill('Correo', 'cliente@qa.local'); await press('Guardar');
  await until(() => content().includes('Cliente desde UI') && buttons('Editar').length, 'Customer saved');
  assert.equal(db.customers[0].name, 'Cliente desde UI');
  await press('Editar'); await fill('Nombre', 'Cliente editado UI'); await press('Guardar'); await until(() => content().includes('Cliente editado UI') && !buttons('Actualizar')[0].props.disabled, 'Customer edit loaded'); assert.equal(db.customers[0].name, 'Cliente editado UI');
  await fill('Buscar en Clientes', 'sin-coincidencias'); assert.ok(content().includes('Sin coincidencias'));
  await fill('Buscar en Clientes', '');
  await press('Notificaciones'); await until(() => !buttons('Actualizar')[0].props.disabled, 'Notifications loaded'); assert.equal(buttons('Nuevo registro').length, 0);
  await press('Proyectos'); await until(() => !buttons('Actualizar')[0].props.disabled, 'Projects loaded'); await press('Nuevo registro'); await fill('Nombre', 'Proyecto desde UI'); await press('Guardar');
  await until(() => buttons('Iniciar').length && !buttons('Iniciar')[0].props.disabled, 'Project saved');
  assert.equal(db.projects[0].ownerId, db.users[0].id);
  await press('Iniciar'); await until(() => buttons('Cerrar proyecto').length && !buttons('Cerrar proyecto')[0].props.disabled, 'Project started'); assert.equal(db.projects[0].status, 'active');
  await press('Finanzas'); await until(() => !buttons('Actualizar')[0].props.disabled, 'Finance loaded'); await press('Nuevo registro'); await fill('Categoría', 'Servicios UI'); await fill('Monto', '345,67'); await press('Guardar');
  await until(() => buttons('Marcar pagado').length && !buttons('Marcar pagado')[0].props.disabled, 'Transaction saved');
  assert.equal(db.financialTransactions[0].amount, 345.67);
  await press('Marcar pagado'); await until(() => !buttons('Marcar pagado').length && !buttons('Actualizar')[0].props.disabled, 'Transaction paid'); assert.equal(db.financialTransactions[0].status, 'paid');
  await press('Incidencias'); await until(() => !buttons('Actualizar')[0].props.disabled, 'Incidents loaded'); await press('Nuevo registro'); await fill('Título', 'Incidencia desde UI'); await press('Guardar'); await until(() => buttons('Resolver').length && !buttons('Resolver')[0].props.disabled, 'Incident saved'); await press('Resolver'); await until(() => !buttons('Resolver').length && !buttons('Actualizar')[0].props.disabled, 'Incident resolved'); assert.equal(db.incidents[0].status, 'resolved');
  await press('Productos'); await until(() => !buttons('Actualizar')[0].props.disabled, 'Products loaded'); await press('Nuevo registro');
  for (const [field, value] of [['Nombre', 'Producto desde UI'], ['SKU', 'UI-1'], ['Precio', '20'], ['Costo', '10'], ['Stock mínimo', '1']]) await fill(field, value);
  await press('Guardar'); await until(() => buttons('Editar').length && !buttons('Actualizar')[0].props.disabled, 'Product saved');
  await press('Inventario'); await until(() => !buttons('Actualizar')[0].props.disabled, 'Inventory loaded'); await press('Nuevo registro'); await press('Seleccionar…'); await press('Producto desde UI · UI-1'); await fill('Cantidad', '5'); await press('Guardar'); await until(() => !buttons('Guardar').length && !buttons('Actualizar')[0].props.disabled, 'Movement saved');
  await press('Ventas'); await until(() => !buttons('Actualizar')[0].props.disabled, 'Sales loaded'); await press('Nuevo registro');
  // The customer picker and the product picker each start with the same label.
  await act(async () => buttons('Seleccionar…')[0].props.onPress()); await press('Cliente editado UI'); await press('Seleccionar…'); await press('Producto desde UI · UI-1'); await fill('Cantidad', '2'); await press('Agregar producto'); await press('Guardar');
  await until(() => !buttons('Guardar').length && !buttons('Actualizar')[0].props.disabled, 'Sale saved'); assert.equal(db.sales[0].total, 40);
  await press('Proveedores'); await until(() => !buttons('Actualizar')[0].props.disabled, 'Suppliers loaded'); await press('Nuevo registro'); await fill('Nombre', 'Proveedor desde UI'); await press('Guardar'); await until(() => buttons('Editar').length && !buttons('Actualizar')[0].props.disabled, 'Supplier saved');
  await press('Compras'); await until(() => !buttons('Actualizar')[0].props.disabled, 'Purchases loaded'); await press('Nuevo registro');
  await act(async () => buttons('Seleccionar…')[0].props.onPress()); await press('Proveedor desde UI'); await press('Seleccionar…'); await press('Producto desde UI · UI-1'); await fill('Cantidad', '3'); await press('Agregar producto'); await press('Guardar');
  await until(() => buttons('Aprobar').length && !buttons('Aprobar')[0].props.disabled, 'Purchase saved'); await press('Aprobar'); await until(() => buttons('Recibir mercancía').length && !buttons('Recibir mercancía')[0].props.disabled, 'Purchase approved'); await press('Recibir mercancía'); await until(() => !buttons('Recibir mercancía').length && !buttons('Actualizar')[0].props.disabled, 'Purchase received');
  const finalStock = db.movements.reduce((sum, movement) => sum + (movement.type === 'out' ? -movement.quantity : movement.quantity), 0); assert.equal(finalStock, 6);
  const savedSales = [...db.sales];
  const excludedSale = { ...db.sales[0], id: 'qa-excluded-report-sale', total: 999 };
  db.sales.push(excludedSale);
  const originalDocument = globalThis.document;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const reportDownloads = [];
  try {
    await press('Reportes'); await until(() => buttons('Exportar PDF').length && !buttons('Actualizar')[0].props.disabled, 'Reports loaded');
    assert.equal(buttons('Exportar Excel').length, 1);
    assert.ok(!buttons('Exportar PDF')[0].props.disabled && !buttons('Exportar Excel')[0].props.disabled);
    await fill('Buscar en Reportes', db.sales[0].id);
    assert.ok(content().includes(db.sales[0].id));
    URL.createObjectURL = blob => { reportDownloads.push({ blob }); return `blob:fanix-report-${reportDownloads.length}`; };
    URL.revokeObjectURL = () => {};
    globalThis.document = {
      body: { appendChild() {} },
      createElement() {
        return { style: {}, click() { reportDownloads.at(-1).filename = this.download; }, remove() {} };
      },
    };
    await press('Exportar PDF');
    await press('Exportar Excel');
    const pdfText = new TextDecoder().decode(await reportDownloads[0].blob.arrayBuffer());
    assert.match(reportDownloads[0].filename, /\.pdf$/);
    const selectedIdPrefix = db.sales[0].id.slice(0, 8);
    assert.ok(pdfText.includes(selectedIdPrefix) && !pdfText.includes(excludedSale.id.slice(0, 8)), 'PDF exports only the active search results');
    const reportXlsx = require('@e965/xlsx').read(await reportDownloads[1].blob.arrayBuffer(), { type: 'array' });
    const reportRows = require('@e965/xlsx').utils.sheet_to_json(reportXlsx.Sheets.Ventas, { header: 1, raw: true });
    assert.match(reportDownloads[1].filename, /\.xlsx$/);
    assert.deepEqual(reportRows.slice(5, 6).map(row => row[0]), [db.sales[0].id], 'Excel exports the same active search results as PDF');
    assert.equal(reportRows.find(row => row[0] === 'Monto total')[1], db.sales[0].total, 'Filtered export summary excludes unselected sales');
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    db.sales.splice(0, db.sales.length, ...savedSales);
  }
  await fill('Buscar en Reportes', 'sin coincidencias');
  assert.ok(buttons('Exportar PDF')[0].props.disabled && buttons('Exportar Excel')[0].props.disabled, 'Filtered empty results cannot be exported');
  db.sales.splice(0);
  await fill('Buscar en Reportes', ''); await press('Actualizar'); await until(() => !buttons('Actualizar')[0].props.disabled, 'Empty reports loaded');
  assert.ok(content().includes('Sin registros'));
  assert.ok(buttons('Exportar PDF')[0].props.disabled && buttons('Exportar Excel')[0].props.disabled, 'Empty reports cannot be exported');
  db.sales.push(...savedSales);
  await press('Incidencias'); await until(() => !buttons('Actualizar')[0].props.disabled, 'Mobile incident list');
  globalThis.__qaWidth = 390; await act(async () => renderer.update(React.createElement(App)));
  assert.ok(renderer.root.findAll(node => node.type === 'Text' && text(node) === 'Incidencia desde UI').length);
  await act(async () => renderer.unmount());
  await act(async () => { renderer = create(React.createElement(App)); });
  await until(() => content().includes('Administrador · Propietario'), 'Persistent session restored');
  assert.equal(db.sessions.length, 1, 'Restoration refreshes the existing server session');
  await press('Cerrar sesión'); await until(() => buttons('Iniciar sesión').length, 'Logout'); assert.ok(db.sessions.every(session => session.revokedAt));
  console.log('PASS: landing/login/persistent session/refresh, create/edit/search, notification mode, projects, finance, incidents, product/inventory/sale/purchase, filtered PDF/XLSX parity, empty-state export guards, final stock=6, narrow-screen rendering and server logout.');
} finally {
  if (renderer) await act(async () => renderer.unmount());
  server.close(); await rm(temporary, { recursive: true, force: true });
}
