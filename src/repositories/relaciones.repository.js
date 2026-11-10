// Conceptos clave y relaciones de cada subunidad (antes columnas JSON de `subunidades`).
//
// Extremos `de` / `a` de una relación:
//   · si son uno o más ids de concepto separados por «, » → filas de relacion_extremos (con FK);
//   · si no (texto libre, citas, etiquetas como «praxis guerrera») → columna de_texto / a_texto.
// Así renombrar un concepto actualiza las relaciones, y el texto libre se conserva tal cual.
// Lo que no encaja en las columnas va a `extra`, como en el resto de la base: no se pierde nada.
import { toRow, fromRow, insertRow, orderKeys, isRecord, parseJson } from '../utils/record.js';
import { conceptoIds } from './conceptos.repository.js';

const RELACION = { rel: 'text', inv: 'bool', gr: 'text', voz: 'text', ref: 'text', cond: 'text' };
const RELACION_ORDEN = ['de', 'rel', 'a', 'inv', 'gr', 'voz', 'ref', 'cond', 'destinos'];
const DESTINO = { tipo: 'text', ref: 'text', arista: 'text', t: 'text' };
const DESTINO_ORDEN = ['tipo', 'ref', 'arista', 't', 'hacia'];
const SEP = ', ';

// Datos que la inserción necesita consultar una sola vez por lote.
export async function contexto(db) {
  return { conceptos: await conceptoIds(db) };
}

export function conceptosDeExtremo(texto, conceptos) {
  if (typeof texto !== 'string' || !texto) return null;
  const ids = texto.split(SEP);
  return ids.every(id => conceptos.has(id)) && ids.join(SEP) === texto ? ids : null;
}

const haciaTabulable = h => isRecord(h) && Object.keys(h).length > 0
  && Object.entries(h).every(([k, v]) => (k === 'faq' || k === 'meta') && typeof v === 'string');

async function insertRelacion(db, subId, orden, r, ctx) {
  const row = toRow(r, RELACION, { skip: ['de', 'a', 'destinos'] });
  const extra = parseJson(row.extra) || {};
  const extremos = {};
  for (const lado of ['de', 'a']) {
    if (!(lado in r)) continue;
    const ids = conceptosDeExtremo(r[lado], ctx.conceptos);
    if (ids) extremos[lado] = ids;
    else if (typeof r[lado] === 'string') row[`${lado}_texto`] = r[lado];
    else extra[lado] = r[lado];
  }
  const destinos = Array.isArray(r.destinos) && r.destinos.length && r.destinos.every(isRecord) ? r.destinos : null;
  if ('destinos' in r && !destinos) extra.destinos = r.destinos;
  row.extra = Object.keys(extra).length ? JSON.stringify(extra) : null;

  const { insertId } = await insertRow(db, 'subunidad_relaciones', { ...row, subunidad_id: subId, orden });
  for (const [lado, ids] of Object.entries(extremos)) {
    let i = 0;
    for (const concepto_id of ids) await insertRow(db, 'relacion_extremos', { relacion_id: insertId, lado, orden: i++, concepto_id });
  }
  let i = 0;
  for (const d of destinos || []) {
    const drow = toRow(d, DESTINO, { skip: ['hacia'] });
    if (haciaTabulable(d.hacia)) {
      drow.hacia_faq = d.hacia.faq ?? null;
      drow.hacia_meta = d.hacia.meta ?? null;
    } else if ('hacia' in d) {
      drow.extra = JSON.stringify({ ...(parseJson(drow.extra) || {}), hacia: d.hacia });
    }
    await insertRow(db, 'relacion_destinos', { ...drow, relacion_id: insertId, orden: i++ });
  }
}

// Inserta conceptos clave y relaciones de una subunidad. Devuelve lo que no es una lista
// (y por lo tanto no va a tablas) para que el llamador lo guarde en `extra` de la subunidad.
export async function insertGrafo(db, subId, { relaciones, conceptos_clave }, ctx) {
  const resto = {};
  if (Array.isArray(conceptos_clave) && conceptos_clave.every(c => typeof c === 'string')) {
    let i = 0;
    for (const concepto_id of conceptos_clave) await insertRow(db, 'subunidad_conceptos', { subunidad_id: subId, orden: i++, concepto_id });
  } else if (conceptos_clave !== undefined) resto.conceptos_clave = conceptos_clave;

  if (Array.isArray(relaciones) && relaciones.every(isRecord)) {
    let i = 0;
    for (const r of relaciones) await insertRelacion(db, subId, i++, r, ctx);
  } else if (relaciones !== undefined) resto.relaciones = relaciones;
  return resto;
}

const group = (rows, key) => rows.reduce((m, r) => m.set(r[key], [...(m.get(r[key]) || []), r]), new Map());

// { subId: { conceptos_clave: [...], relaciones: [...] } } para las subunidades pedidas (o todas).
export async function loadGrafo(db, subIds = null) {
  const filtro = subIds ? `WHERE subunidad_id IN (${subIds.map(() => '?').join(',') || 'NULL'})` : '';
  const params = subIds || [];
  const [conceptos, relaciones] = await Promise.all([
    db.query(`SELECT * FROM subunidad_conceptos ${filtro} ORDER BY subunidad_id, orden`, params),
    db.query(`SELECT * FROM subunidad_relaciones ${filtro} ORDER BY subunidad_id, orden`, params),
  ]);
  const relIds = relaciones.map(r => r.id);
  const marks = relIds.map(() => '?').join(',') || 'NULL';
  const [extremos, destinos] = relIds.length ? await Promise.all([
    db.query(`SELECT * FROM relacion_extremos WHERE relacion_id IN (${marks}) ORDER BY relacion_id, lado, orden`, relIds),
    db.query(`SELECT * FROM relacion_destinos WHERE relacion_id IN (${marks}) ORDER BY relacion_id, orden`, relIds),
  ]) : [[], []];
  const extremosDe = group(extremos, 'relacion_id');
  const destinosDe = group(destinos, 'relacion_id');

  const out = new Map();
  const entry = id => out.get(id) || out.set(id, { conceptos_clave: [], relaciones: [] }).get(id);
  for (const c of conceptos) entry(c.subunidad_id).conceptos_clave.push(c.concepto_id);
  for (const row of relaciones) {
    const r = fromRow(row, RELACION);
    const ext = extremosDe.get(row.id) || [];
    for (const lado of ['de', 'a']) {
      const ids = ext.filter(e => e.lado === lado).map(e => e.concepto_id);
      if (ids.length) r[lado] = ids.join(SEP);
      else if (row[`${lado}_texto`] != null) r[lado] = row[`${lado}_texto`];
    }
    const ds = destinosDe.get(row.id);
    if (ds) {
      r.destinos = ds.map(d => {
        const obj = fromRow(d, DESTINO);
        if (d.hacia_faq != null || d.hacia_meta != null) {
          obj.hacia = {};
          if (d.hacia_faq != null) obj.hacia.faq = d.hacia_faq;
          if (d.hacia_meta != null) obj.hacia.meta = d.hacia_meta;
        }
        return orderKeys(obj, DESTINO_ORDEN);
      });
    }
    if (row.extra) Object.assign(r, parseJson(row.extra)); // `extra` tiene la última palabra
    entry(row.subunidad_id).relaciones.push(orderKeys(r, RELACION_ORDEN));
  }
  return out;
}

// Subunidades y relaciones que mencionan un concepto (para el editor y para avisos de borrado).
export async function usosDeConcepto(db, conceptoId) {
  const [clave, extremos] = await Promise.all([
    db.query('SELECT subunidad_id FROM subunidad_conceptos WHERE concepto_id = ? ORDER BY subunidad_id', [conceptoId]),
    db.query(`SELECT DISTINCT r.subunidad_id, r.orden, e.lado FROM relacion_extremos e
      JOIN subunidad_relaciones r ON r.id = e.relacion_id WHERE e.concepto_id = ? ORDER BY r.subunidad_id, r.orden`, [conceptoId]),
  ]);
  return { conceptos_clave: clave.map(r => r.subunidad_id), relaciones: extremos };
}

export async function relacionesHaciaFaq(db, faqId) {
  return db.query(`SELECT DISTINCT r.subunidad_id, r.orden FROM relacion_destinos d
    JOIN subunidad_relaciones r ON r.id = d.relacion_id WHERE d.hacia_faq = ? ORDER BY r.subunidad_id, r.orden`, [faqId]);
}
