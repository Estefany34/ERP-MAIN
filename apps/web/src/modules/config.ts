export type Field = { key: string; label: string; required?: boolean; numeric?: boolean; integer?: boolean; min?: number; max?: number; maxLength?: number; options?: string[]; source?: string; email?: boolean };
export type ModuleConfig = { label: string; path: string; columns: { key: string; label: string }[]; fields?: Field[]; writeRoles?: string[]; readRoles?: string[]; editable?: boolean; commercial?: 'sale' | 'purchase' | 'quote' };
const managers = ['owner', 'admin'];
const sales = [...managers, 'sales'];
const inventory = [...managers, 'inventory'];
const name: Field = { key: 'name', label: 'Nombre', required: true, maxLength: 120 };
const contact: Field[] = [name, { key: 'email', label: 'Correo', email: true }, { key: 'phone', label: 'Teléfono', maxLength: 40 }];
const status = { key: 'status', label: 'Estado' };
const amount = { key: 'amount', label: 'Monto' };
const date = { key: 'createdAt', label: 'Fecha' };
const colName = { key: 'name', label: 'Nombre' };
const product: Field = { key: 'productId', label: 'Producto', required: true, source: 'products' };
const quantity: Field = { key: 'quantity', label: 'Cantidad', required: true, numeric: true, integer: true, min: 1 };
export const modules: ModuleConfig[] = [
  { label: 'Clientes', path: 'customers', fields: [...contact, { key: 'classification', label: 'Clasificación', maxLength: 40 }], columns: [colName, { key: 'email', label: 'Correo' }, { key: 'phone', label: 'Teléfono' }], writeRoles: sales, editable: true },
  { label: 'Productos', path: 'products', fields: [name, { key: 'sku', label: 'SKU', required: true, maxLength: 40 }, { key: 'price', label: 'Precio', numeric: true, required: true, min: 0 }, { key: 'cost', label: 'Costo', numeric: true, required: true, min: 0 }, { key: 'stockMinimum', label: 'Stock mínimo', numeric: true, integer: true, required: true, min: 0 }], columns: [colName, { key: 'sku', label: 'SKU' }, { key: 'price', label: 'Precio' }, { key: 'stock', label: 'Stock' }], writeRoles: inventory, editable: true },
  { label: 'Inventario', path: 'inventory/movements', fields: [product, { key: 'type', label: 'Movimiento', options: ['in', 'out'], required: true }, quantity], columns: [{ key: 'productId', label: 'Producto' }, { key: 'type', label: 'Movimiento' }, { key: 'quantity', label: 'Cantidad' }, date], writeRoles: inventory },
  { label: 'Ventas', path: 'sales', fields: [{ key: 'customerId', label: 'Cliente', source: 'customers', required: true }], commercial: 'sale', columns: [{ key: 'customerId', label: 'Cliente' }, { key: 'total', label: 'Total' }, status, date], readRoles: sales, writeRoles: sales },
  { label: 'Cotizaciones', path: 'quotes', fields: [{ key: 'customerId', label: 'Cliente', source: 'customers', required: true }, { key: 'taxRate', label: 'Tasa de impuesto (0 a 1)', numeric: true, min: 0, max: 1, required: true }], commercial: 'quote', columns: [{ key: 'customerId', label: 'Cliente' }, { key: 'total', label: 'Total' }, status], readRoles: sales, writeRoles: sales },
  { label: 'Compras', path: 'purchases', fields: [{ key: 'supplierId', label: 'Proveedor', source: 'suppliers', required: true }], commercial: 'purchase', columns: [{ key: 'supplierId', label: 'Proveedor' }, { key: 'total', label: 'Total' }, status], writeRoles: managers },
  { label: 'Proveedores', path: 'suppliers', fields: contact, columns: [colName, { key: 'email', label: 'Correo' }, { key: 'phone', label: 'Teléfono' }], writeRoles: managers, editable: true },
  { label: 'Empleados', path: 'employees', fields: [name, { key: 'email', label: 'Correo', email: true }, { key: 'department', label: 'Departamento', maxLength: 80 }, { key: 'position', label: 'Puesto', maxLength: 80 }, { key: 'status', label: 'Estado', options: ['active', 'inactive'], required: true }], columns: [colName, { key: 'department', label: 'Departamento' }, status], readRoles: managers, writeRoles: managers, editable: true },
  { label: 'Proyectos', path: 'projects', fields: [name, { key: 'ownerId', label: 'Responsable', source: 'company/members', required: true }, { key: 'customerId', label: 'Cliente', source: 'customers' }], columns: [colName, { key: 'ownerId', label: 'Responsable' }, status], writeRoles: sales },
  { label: 'Finanzas', path: 'finance/transactions', fields: [{ key: 'type', label: 'Tipo', options: ['income', 'expense'], required: true }, { key: 'category', label: 'Categoría', required: true, maxLength: 80 }, { key: 'amount', label: 'Monto', numeric: true, required: true, min: 0.01 }, { key: 'reference', label: 'Referencia', maxLength: 120 }], columns: [{ key: 'type', label: 'Tipo' }, { key: 'category', label: 'Categoría' }, amount, status], readRoles: managers, writeRoles: managers },
  { label: 'Incidencias', path: 'incidents', fields: [{ key: 'title', label: 'Título', required: true, maxLength: 160 }, { key: 'description', label: 'Descripción', maxLength: 2000 }], columns: [{ key: 'title', label: 'Incidencia' }, status, date], writeRoles: ['owner', 'admin', 'sales', 'inventory', 'viewer'] },
  { label: 'Notificaciones', path: 'notifications', columns: [{ key: 'message', label: 'Mensaje' }, { key: 'readAt', label: 'Lectura' }, date] },
  { label: 'Sucursales', path: 'branches', fields: [name, { key: 'address', label: 'Dirección', maxLength: 240 }], columns: [colName, { key: 'address', label: 'Dirección' }, { key: 'active', label: 'Activa' }], writeRoles: managers, editable: true },
  { label: 'Almacenes', path: 'warehouses', fields: [name, { key: 'branchId', label: 'Sucursal', source: 'branches' }], columns: [colName, { key: 'branchId', label: 'Sucursal' }], writeRoles: inventory },
  { label: 'Documentos', path: 'documents', columns: [colName, { key: 'category', label: 'Categoría' }, date], readRoles: managers },
  { label: 'Auditoría', path: 'audit-logs', columns: [{ key: 'action', label: 'Acción' }, { key: 'entity', label: 'Entidad' }, date], readRoles: managers },
  { label: 'Reportes', path: 'sales', columns: [{ key: 'customerId', label: 'Cliente' }, { key: 'total', label: 'Total' }, status, date], readRoles: sales },
];
export const labels: Record<string, string> = { active: 'Activo', inactive: 'Inactivo', planned: 'Planeado', closed: 'Cerrado', open: 'Abierta', resolved: 'Resuelta', pending: 'Pendiente', paid: 'Pagado', income: 'Ingreso', expense: 'Egreso', in: 'Entrada', out: 'Salida', adjustment: 'Ajuste', draft: 'Borrador', confirmed: 'Confirmada', approved: 'Aprobada', rejected: 'Rechazada', received: 'Recibida', sent: 'Enviada', accepted: 'Aceptada', expired: 'Vencida' };
