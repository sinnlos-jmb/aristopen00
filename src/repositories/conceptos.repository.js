// Grafo estático (estatico_v1.json): árbol de conceptos y catálogos de relaciones y destinos.
// El resto del archivo (reglas, niveles, voces…) queda en el documento `estatico.meta`, con
// marcadores { "$tabla": … } en el lugar de las secciones que viven en tablas, para que al
// reconstruirlo el orden de las claves sea el original.
import { toRow, fromRow, insertRow, orderKeys, isRecord } from '../utils/record.js';
import * as documentosRepo from './documentos.repository.js';

export const CONCEPTO = { id: 'text', label: 'text', gr: 'text', rel: 'text', voz: 'text', ref: 'text', def: 'text',
  categoria: 'json', sentidos: 'json', atributos: 'json' };
const CONCEPTO_ORDEN = ['id', 'label', 'gr', 'rel', 'voz', 'ref', 'def', 'categoria', 'sentidos', 'atributos', 'hijos'];
const CATALOGOS = {
  relaciones: { table: 'relacion_tipos', spec: { id: 'text', label: 'text' } },
  destinos: { table: 'destino_tipos', spec: { id: 'text', label: 'text', d: 'text' } },
};
const META = 'estatico.meta';

// Qué secciones del estático pueden ir a tablas (listas de objetos con id de texto).
const tabulable = list => Array.isArray(list) && list.every(x => isRecord(x) && typeof x.id === 'string');
const arbolTabulable = nodes => tabulable(nodes) && nodes.every(n => n.hijos === undefined || (arbolTabulable(n.hijos) && n.hijos.length));

export async function insertEstatico(db, estatico) {
  if (!estatico) return;
  const meta = { ...estatico };
  if (arbolTabulable(estatico.raices)) {
    meta.raices = { $tabla: 'conceptos' };
    const walk = async (nodes, padre) => {
      let i = 0;
      for (const n of nodes) {
        await insertRow(db, 'conceptos', { ...toRow(n, CONCEPTO, { skip: ['hijos'] }), padre_id: padre, orden: i++ });
        if (n.hijos) await walk(n.hijos, n.id);
      }
    };
    await walk(estatico.raices, null);
  }
  for (const [key, { table, spec }] of Object.entries(CATALOGOS)) {
    if (!tabulable(estatico[key])) continue;
    meta[key] = { $tabla: table };
    let i = 0;
    for (const item of estatico[key]) await insertRow(db, table, { ...toRow(item, spec), orden: i++ });
  }
  await documentosRepo.putDocumento(db, META, meta);
}

export async function listConceptos(db) {
  const rows = await db.query('SELECT * FROM conceptos ORDER BY orden');
  const hijos = new Map();
  for (const r of rows) hijos.set(r.padre_id, [...(hijos.get(r.padre_id) || []), r]);
  const build = r => {
    const n = fromRow(r, CONCEPTO);
    if (hijos.has(r.id)) n.hijos = hijos.get(r.id).map(build);
    return orderKeys(n, CONCEPTO_ORDEN);
  };
  return (hijos.get(null) || []).map(build);
}

export async function getEstatico(db) {
  const meta = (await documentosRepo.getDocumentos(db, META))[META];
  if (!meta) return null;
  const out = { ...meta };
  for (const [key, value] of Object.entries(meta)) {
    if (!isRecord(value) || !value.$tabla) continue;
    if (value.$tabla === 'conceptos') out[key] = await listConceptos(db);
    else {
      const cat = Object.values(CATALOGOS).find(c => c.table === value.$tabla);
      const rows = await db.query(`SELECT * FROM \`${cat.table}\` ORDER BY orden`);
      out[key] = rows.map(r => fromRow(r, cat.spec));
    }
  }
  return out;
}

export async function conceptoIds(db) {
  return new Set((await db.query('SELECT id FROM conceptos')).map(r => r.id));
}

export async function deleteAll(db) {
  await db.query('DELETE FROM conceptos WHERE padre_id IS NULL'); // los hijos caen en cascada
  await db.query('DELETE FROM relacion_tipos');
  await db.query('DELETE FROM destino_tipos');
}
