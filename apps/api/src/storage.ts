import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const root = path.resolve(process.env.DOCUMENT_STORAGE_PATH ?? './data/documents');

export async function writeDocument(contentBase64: string, extension = 'bin') {
  const content = Buffer.from(contentBase64, 'base64');
  if (content.length > 5 * 1024 * 1024) throw new Error('DOCUMENT_TOO_LARGE');
  const safeExtension = extension.replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'bin';
  const key = `${randomUUID()}.${safeExtension}`;
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, key), content, { flag: 'wx' });
  return { key, bytes: content.length };
}

export async function readDocument(key: string) {
  if (!/^[a-f0-9-]{36}\.[a-z0-9]{1,10}$/i.test(key)) throw new Error('INVALID_STORAGE_KEY');
  return readFile(path.join(root, key));
}
