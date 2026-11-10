// FAQ con sus variantes y pasajes.
import { toRow, fromRow, insertRow, updateRow, orderKeys } from '../utils/record.js';

export const FAQ = { id: 'text', pregunta: 'text', estado: 'text', argumento: 'text', definicion: 'text',
  exposicion_directa: 'bool', arbol: 'json', tambien: 'json', firmas: 'json', respuesta: 'json' };
const PASAJE = { ref: 'text', rol: 'text' };
const FAQ_ORDEN = ['id', 'pregunta', 'variantes', 'pasajes', 'estado', 'trayecto_curado', 'arbol', 'tambien', 'firmas',
  'argumento', 'exposicion_directa', 'respuesta', 'definicion'];
// Campos que no se guardan en la fila: hijos o derivados (trayecto_curado = tiene trayecto publicado).
const SKIP = ['variantes', 'pasajes', 'trayecto_curado'];

async function children(db, ids) {
  if (!ids.length) return { variantes: new Map(), pasajes: new Map() };
  const marks = ids.map(() => '?').join(',');
  const [vars, pas, pub] = await Promise.all([
    db.query(`SELECT * FROM faq_variantes WHERE faq_id IN (${marks}) ORDER BY faq_id, orden`, ids),
    db.query(`SELECT * FROM faq_pasajes WHERE faq_id IN (${marks}) ORDER BY faq_id, orden`, ids),
    db.query(`SELECT faq_id FROM trayectos WHERE estado = 'publicado' AND faq_id IN (${marks})`, ids),
  ]);
  const group = (rows, map) => rows.reduce((m, r) => m.set(r.faq_id, [...(m.get(r.faq_id) || []), map(r)]), new Map());
  return {
    variantes: group(vars, r => r.texto),
    pasajes: group(pas, r => fromRow(r, PASAJE)),
    curadas: new Set(pub.map(r => r.faq_id)),
  };
}

function assemble(row, ch) {
  const faq = fromRow(row, FAQ);
  faq.variantes = ch.variantes.get(row.id) || [];
  faq.pasajes = ch.pasajes.get(row.id) || [];
  if (ch.curadas?.has(row.id)) faq.trayecto_curado = true;
  return orderKeys(faq, FAQ_ORDEN);
}

export async function listFaqs(db) {
  const rows = await db.query('SELECT * FROM faqs ORDER BY orden');
  const ch = await children(db, rows.map(r => r.id));
  return rows.map(r => assemble(r, ch));
}

export async function getFaq(db, id) {
  const [row] = await db.query('SELECT * FROM faqs WHERE id = ?', [id]);
  if (!row) return null;
  return assemble(row, await children(db, [id]));
}

export async function exists(db, id) {
  const [row] = await db.query('SELECT 1 AS ok FROM faqs WHERE id = ?', [id]);
  return !!row;
}

export async function nextOrden(db) {
  const [row] = await db.query('SELECT COALESCE(MAX(orden), -1) + 1 AS n FROM faqs');
  return row.n;
}

async function insertChildren(db, faq) {
  let i = 0;
  for (const texto of faq.variantes || []) await insertRow(db, 'faq_variantes', { faq_id: faq.id, orden: i++, texto });
  i = 0;
  for (const p of faq.pasajes || []) await insertRow(db, 'faq_pasajes', { ...toRow(p, PASAJE), faq_id: faq.id, orden: i++ });
}

export async function insertFaq(db, faq, orden) {
  await insertRow(db, 'faqs', { ...toRow(faq, FAQ, { skip: SKIP }), orden });
  await insertChildren(db, faq);
}

// Reemplaza la FAQ completa (fila + variantes + pasajes), conservando su orden.
export async function replaceFaq(db, faq) {
  const row = toRow(faq, FAQ, { skip: SKIP });
  for (const col of Object.keys(FAQ)) if (!(col in row)) row[col] = null; // los campos omitidos se borran
  delete row.id;
  await updateRow(db, 'faqs', 'id', faq.id, row);
  await db.query('DELETE FROM faq_variantes WHERE faq_id = ?', [faq.id]);
  await db.query('DELETE FROM faq_pasajes WHERE faq_id = ?', [faq.id]);
  await insertChildren(db, faq);
}

export async function deleteFaq(db, id) {
  const r = await db.query('DELETE FROM faqs WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

export async function deleteAll(db) {
  await db.query('DELETE FROM faq_pasajes');
  await db.query('DELETE FROM faq_variantes');
  await db.query('DELETE FROM faqs');
}
