// Comparaciones entre MariaDB y API. Solo SELECT. Opt-in: INTEGRATION_DB=1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { getBundle, ids, request } from './helpers.mjs';

const ENABLED = process.env.INTEGRATION_DB === '1';
const opts = { skip: !ENABLED && 'activar con INTEGRATION_DB=1 (solo SELECT)' };
let pool;

test.before(async () => {
  if (!ENABLED) return;
  let mariadb;
  try { ({ default: mariadb } = await import('mariadb')); }
  catch { throw new Error('Falta el driver mariadb: ejecutá npm install en el backend'); }
  pool = mariadb.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'agora',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'aristotle',
    connectionLimit: 1,
    connectTimeout: 5000,
    multipleStatements: false,
    autoJsonMap: false,
  });
});

test.after(async () => { if (pool) await pool.end(); });

async function query(sql, values = []) {
  assert.ok(/^\s*SELECT\b/i.test(sql), `No se permiten sentencias no SELECT: ${sql.slice(0, 40)}`);
  return pool.query(sql, values);
}

test('La conexión apunta al esquema previsto', opts, async () => {
  const [row] = await query('SELECT DATABASE() AS nombre, VERSION() AS version');
  assert.equal(row.nombre, process.env.DB_NAME || 'aristotle');
  assert.ok(row.version);
});

test('Los identificadores editoriales son los mismos en MariaDB y /api/contenido', opts, async () => {
  const bundle = await getBundle();
  for (const [table, entities] of [
    ['unidades', bundle.tags.unidades],
    ['subunidades', bundle.tags.unidades.flatMap(u => u.subunidades || [])],
    ['faqs', bundle.tags.faqs],
  ]) {
    const rows = await query(`SELECT id FROM \`${table}\` ORDER BY id`);
    assert.deepEqual(ids(rows, `DB.${table}`), ids(entities, `API.${table}`), `DB/API: ${table}`);
  }
});

test('Los trayectos publicados del bundle corresponden a MariaDB (sin editarlos)', opts, async () => {
  const bundle = await getBundle();
  const rows = await query("SELECT id FROM trayectos WHERE estado = 'publicado' ORDER BY id");
  assert.deepEqual(ids(rows, 'DB.trayectos'), ids(bundle.trayectos.trayectos, 'API.trayectos'));
  const duplicate = await query("SELECT faq_id, COUNT(*) AS n FROM trayectos WHERE estado = 'publicado' GROUP BY faq_id HAVING COUNT(*) > 1");
  assert.equal(duplicate.length, 0, 'Hay más de un trayecto publicado por FAQ');
});

test('La traducción y el griego entregados por la API coinciden con el documento SQL', opts, async () => {
  const rows = await query('SELECT contenido FROM documentos WHERE clave = ?', ['texto.EN_libro1_v8']);
  assert.equal(rows.length, 1, 'Documento de lectura ausente');
  const fromDb = typeof rows[0].contenido === 'string' ? JSON.parse(rows[0].contenido) : rows[0].contenido;
  assert.ok(typeof fromDb === 'string' && fromDb.length > 0, 'El documento no contiene texto');
  const response = await request('/api/texto/EN_libro1_v8.txt');
  assert.equal(response.status, 200);
  const fromApi = await response.text();
  assert.equal(fromApi, fromDb, 'Texto de API distinto al texto almacenado en MariaDB');
  const hash = createHash('sha256').update(fromDb, 'utf8').digest('hex');
  assert.equal(response.headers.get('x-texto-sha256'), hash, 'SHA-256 incorrecto');
});
