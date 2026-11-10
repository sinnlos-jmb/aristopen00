// Unidades y subunidades del corpus. Los conceptos clave y las relaciones de cada subunidad
// viven en tablas propias (relaciones.repository.js) y se agregan al leer.
import { toRow, fromRow, insertRow, updateRow, orderKeys, parseJson } from '../utils/record.js';
import * as relacionesRepo from './relaciones.repository.js';

export const UNIDAD = { id: 'text', titulo: 'text', resumen: 'text', estado: 'text',
  tramos: 'json', parrafos: 'json', grafo: 'json', articulacion: 'json' };
export const SUBUNIDAD = { id: 'text', titulo: 'text', estado: 'text', estado_textual: 'text', intro: 'text',
  bekker: 'json', gr_ancla: 'json', es_ancla: 'json', movimientos: 'json', voz_texto: 'json',
  notas: 'json', pilares: 'json', grafo_aristas: 'json', mapa: 'json', claves: 'json' };
const SUBUNIDAD_ORDEN = ['id', 'bekker', 'titulo', 'estado', 'estado_textual', 'gr_ancla', 'es_ancla', 'movimientos',
  'voz_texto', 'intro', 'conceptos_clave', 'relaciones', 'notas', 'grafo_aristas', 'mapa', 'claves'];

// `relaciones` y `conceptos_clave` siempre salen como lista (vacía si no hay filas),
// salvo que `extra` guarde un valor que no era lista.
function subunidad(row, grafo) {
  const g = grafo.get(row.id) || { conceptos_clave: [], relaciones: [] };
  const sub = { ...g, ...fromRow(row, SUBUNIDAD) };
  return orderKeys(sub, SUBUNIDAD_ORDEN);
}

export async function listUnidades(db) {
  const [unidades, subs, grafo] = await Promise.all([
    db.query('SELECT * FROM unidades ORDER BY orden'),
    db.query('SELECT * FROM subunidades ORDER BY unidad_id, orden'),
    relacionesRepo.loadGrafo(db),
  ]);
  const byUnidad = new Map();
  for (const r of subs) {
    if (!byUnidad.has(r.unidad_id)) byUnidad.set(r.unidad_id, []);
    byUnidad.get(r.unidad_id).push(subunidad(r, grafo));
  }
  return unidades.map(r => ({ ...fromRow(r, UNIDAD), subunidades: byUnidad.get(r.id) || [] }));
}

export async function getUnidad(db, id) {
  const [row] = await db.query('SELECT * FROM unidades WHERE id = ?', [id]);
  if (!row) return null;
  const subs = await db.query('SELECT * FROM subunidades WHERE unidad_id = ? ORDER BY orden', [id]);
  const grafo = await relacionesRepo.loadGrafo(db, subs.map(s => s.id));
  return { ...fromRow(row, UNIDAD), subunidades: subs.map(r => subunidad(r, grafo)) };
}

export async function getSubunidad(db, id) {
  const [row] = await db.query('SELECT * FROM subunidades WHERE id = ?', [id]);
  if (!row) return null;
  return { ...subunidad(row, await relacionesRepo.loadGrafo(db, [id])), unidad: row.unidad_id };
}

// Devuelve { id: { id, titulo, bekker } } de las subunidades que existen.
export async function findSubunidades(db, ids) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return {};
  const rows = await db.query(`SELECT id, titulo, bekker FROM subunidades WHERE id IN (${unique.map(() => '?').join(',')})`, unique);
  return Object.fromEntries(rows.map(r => [r.id, fromRow(r, { id: 'text', titulo: 'text', bekker: 'json' })]));
}

async function insertSubunidad(db, sub, unidadId, orden, ctx) {
  const row = { ...toRow(sub, SUBUNIDAD, { skip: ['relaciones', 'conceptos_clave'] }), unidad_id: unidadId, orden };
  await insertRow(db, 'subunidades', row);
  const resto = await relacionesRepo.insertGrafo(db, sub.id, sub, ctx);
  if (Object.keys(resto).length) {
    await updateRow(db, 'subunidades', 'id', sub.id, { extra: JSON.stringify({ ...(parseJson(row.extra) || {}), ...resto }) });
  }
}

export async function insertUnidad(db, unidad, orden, ctx) {
  ctx ||= await relacionesRepo.contexto(db);
  await insertRow(db, 'unidades', { ...toRow(unidad, UNIDAD, { skip: ['subunidades'] }), orden });
  let i = 0;
  for (const sub of unidad.subunidades || []) await insertSubunidad(db, sub, unidad.id, i++, ctx);
}

export async function deleteAll(db) {
  await db.query('DELETE FROM subunidades'); // en cascada: conceptos clave, relaciones, extremos y destinos
  await db.query('DELETE FROM unidades');
}
