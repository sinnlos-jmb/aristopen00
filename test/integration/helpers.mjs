import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BASE_URL = (process.env.INTEGRATION_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
export const TIMEOUT_MS = Number(process.env.INTEGRATION_TIMEOUT_MS || 60000);
export const PUBLIC_DIR = process.env.PUBLIC_DIR
  ? path.resolve(process.env.PUBLIC_DIR)
  : [path.join(ROOT, 'public'), path.resolve(ROOT, '../public')].find(p => existsSync(path.join(p, 'js/store.js')));

export function ids(rows, label) {
  assert.ok(Array.isArray(rows), `${label}: se esperaba un arreglo`);
  const result = rows.map(row => {
    assert.ok(row && typeof row.id === 'string' && row.id.trim(), `${label}: identificador inválido`);
    return row.id;
  });
  assert.equal(new Set(result).size, result.length, `${label}: identificadores duplicados`);
  return result.sort();
}

export async function request(url, { method = 'GET', json } = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers: json === undefined ? {} : { 'content-type': 'application/json' },
    body: json === undefined ? undefined : JSON.stringify(json),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'error',
  });
  return res;
}

export async function json(url, options) {
  const res = await request(url, options);
  const raw = await res.text();
  let body;
  try { body = JSON.parse(raw); }
  catch { assert.fail(`${url}: no devolvió JSON válido (HTTP ${res.status})`); }
  assert.equal(res.status, 200, `${url}: HTTP ${res.status}; ${JSON.stringify(body).slice(0, 350)}`);
  return body;
}

let bundlePromise;
export const getBundle = () => bundlePromise ||= json('/api/contenido');

export function assertBundle(bundle) {
  assert.ok(bundle && typeof bundle === 'object', 'Contenido no es objeto');
  assert.ok(Array.isArray(bundle.tags?.unidades) && bundle.tags.unidades.length, 'Faltan unidades');
  assert.ok(Array.isArray(bundle.tags?.faqs) && bundle.tags.faqs.length, 'Faltan FAQ');
  assert.ok(Array.isArray(bundle.estatico?.raices), 'Falta árbol conceptual');
  assert.ok(Array.isArray(bundle.funcional?.categorias), 'Falta árbol funcional');
  assert.ok(bundle.manual && bundle.argumentos, 'Falta contenido de manual/argumentos');
  assert.ok(Array.isArray(bundle.trayectos?.trayectos), 'Falta catálogo de trayectos');
  ids(bundle.tags.unidades, 'unidades');
  ids(bundle.tags.faqs, 'FAQ');
  ids(bundle.tags.unidades.flatMap(u => u.subunidades || []), 'subunidades');
  assert.ok(bundle.trayectos.trayectos.every(t => t.estado === 'publicado'), 'Contenido público incluye trayectos no publicados');
}

export const noDuplicate = list => new Set(list).size === list.length;
