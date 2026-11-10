// Contenido de manual_v1.json: por subunidad, por arista, por concepto y notas laterales.
import { toRow, fromRow, insertRow } from '../utils/record.js';

const TABLES = {
  por_subunidad: { table: 'manual_subunidades', key: 'clave', spec: { exposicion: 'text', ejemplo: 'text', cita: 'text',
    transicion_previa: 'text', transicion_siguiente: 'text', borrador: 'bool', notas_laterales: 'json', ids: 'json' } },
  por_arista: { table: 'manual_aristas', key: 'clave', spec: { transicion: 'text', borrador: 'bool' } },
  por_concepto: { table: 'manual_conceptos', key: 'concepto', spec: { apertura: 'text', definicion_corta: 'text',
    mapa_obra: 'text', notas_laterales: 'json' } },
  notas_laterales: { table: 'notas_laterales', key: 'id', spec: { titulo: 'text', ref: 'text', texto: 'text',
    conceptos: 'json', subs: 'json' } },
};

export const SECCIONES = Object.keys(TABLES);

export async function getSecciones(db) {
  const out = {};
  for (const [name, { table, key, spec }] of Object.entries(TABLES)) {
    const rows = await db.query(`SELECT * FROM \`${table}\` ORDER BY orden`);
    out[name] = Object.fromEntries(rows.map(r => [r[key], fromRow(r, spec)]));
  }
  return out;
}

export async function insertSecciones(db, manual) {
  for (const [name, { table, key, spec }] of Object.entries(TABLES)) {
    let orden = 0;
    for (const [k, value] of Object.entries(manual[name] || {})) {
      await insertRow(db, table, { ...toRow(value, spec), [key]: k, orden: orden++ });
    }
  }
}

export async function existingNotas(db, ids) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return {};
  const rows = await db.query(`SELECT id, titulo FROM notas_laterales WHERE id IN (${unique.map(() => '?').join(',')})`, unique);
  return Object.fromEntries(rows.map(r => [r.id, { titulo: r.titulo }]));
}

export async function deleteAll(db) {
  for (const { table } of Object.values(TABLES)) await db.query(`DELETE FROM \`${table}\``);
}
