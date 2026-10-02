import type { Field } from './config';
export function fieldError(field: Field, raw: string) {
  const value = raw.trim();
  if (!value) return field.required ? 'Completa este campo.' : '';
  if (field.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254)) return 'Escribe un correo válido.';
  if (field.key === 'phone' && (value.length < 7 || value.length > 20 || !/^\+?[0-9 ()\-]+$/.test(value))) return 'Usa un teléfono válido de 7 a 20 caracteres.';
  if (field.key === 'sku' && !/^[A-Za-z0-9._\-]+$/.test(value)) return 'SKU: usa letras, números, punto, guion o guion bajo.';
  if (field.key === 'name' && !/^[\p{L}\p{M}0-9 .,'&()\-]+$/u.test(value)) return 'El nombre contiene caracteres no permitidos.';
  if (['classification', 'department', 'position', 'category', 'reference', 'title'].includes(field.key) && !/^[\p{L}\p{M}0-9 .,'&()_\-/#]*$/u.test(value)) return 'El campo contiene caracteres no permitidos.';
  if (field.maxLength && value.length > field.maxLength) return `Máximo ${field.maxLength} caracteres.`;
  if (['name', 'title', 'category'].includes(field.key) && value.length < 2) return 'Escribe al menos dos caracteres.';
  if (field.numeric) {
    const normalized = value.replace(',', '.');
    const number = Number(normalized);
    if (!Number.isFinite(number) || (field.integer && !/^\d+$/.test(normalized)) || (field.min !== undefined && number < field.min) || (field.max !== undefined && number > field.max)) return 'Escribe un número válido dentro del rango permitido.';
    if (['price', 'cost', 'amount'].includes(field.key) && !/^\d+(\.\d{1,2})?$/.test(normalized)) return 'Usa como máximo dos decimales.';
  }
  return '';
}
