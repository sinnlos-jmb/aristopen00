// Lectura transaccional: todos los datos corresponden al mismo instante de MariaDB.
// No efectúa modificaciones; un error (incluidas fuentes ausentes) invalida la lectura.
import { getPool } from '../utils/db.js';
import { buildBundle } from '../services/contenido.service.js';
import { parseJson } from '../utils/record.js';
import { HttpError } from '../utils/http-error.js';
export const GRAFOS_KEY = 'labo.corpus.fuentes.v1';
export const TEXTO_KEY = 'texto.EN_libro1_v8';
export const EDITORIAL_KEY = 'labo.editorial.v1';

// El parseo de citas puede contener correcciones humanas: se verifica, no se regenera ni se pisa.
export function validarReferenciasGrafos(graphs,refsIndex) {
  const refs=new Map();
  for(const item of refsIndex.entradas){
    const key=`${item.file}|${item.kind}|${item.id}`;
    if(refs.has(key)||!Array.isArray(item.refs))throw new HttpError(503,'El índice de referencias tiene entradas duplicadas o incompletas; requiere revisión.');
    refs.set(key,item);
  }
  let n=0;
  for(const g of graphs)for(const [kind,items] of [['nodo',g.data.NODES],['arista',g.data.EDGES]])for(const item of items){
    if(!item.ref)continue;n++;
    const entry=refs.get(`${g.graph.file}|${kind}|${item.id}`);
    const meta=entry&&entry.graph===g.graph.id&&entry.label===item.label&&entry.raw===item.ref&&
      (entry.raw_cf||'')===(kind==='arista'?(item.ref_cf||''):'')&&
      (entry.tipo||null)===(kind==='nodo'?(item.type||null):(item.kind||item.rel||null))&&
      (kind==='nodo'?((entry.conceptId||null)===(item.conceptId||null)&&(entry.concepto||null)===(item.concepto||null)):
       (entry.title===item.title&&entry.source===item.source&&entry.target===item.target));
    if(!meta || (entry.raw_cf&&!Array.isArray(entry.refs_cf)))
      throw new HttpError(503,`El índice de referencias de grafos no coincide con ${g.graph.file}: ${kind} ${item.id}. Requiere revisión; no se regeneró automáticamente.`);
  }
  if(n!==refs.size)throw new HttpError(503,'El índice de referencias de grafos contiene entradas sin correspondencia; requiere revisión.');
}

export function validarFuentes({tags, estatico, funcional, textRaw, refsIndex, graphIndex, graphs, editorial}) {
  if (!tags?.unidades || !tags?.faqs || !estatico?.raices || !funcional?.categorias || !funcional?.aristas)
    throw new HttpError(503, 'El tagueo o sus árboles están incompletos en la base.');
  if (typeof textRaw !== 'string' || !textRaw.trim()) throw new HttpError(503, 'El texto EN I no está cargado en la base.');
  if (!Array.isArray(refsIndex?.entradas) || !Array.isArray(graphIndex) || !Array.isArray(graphs) || !graphIndex.length)
    throw new HttpError(503, 'Las fuentes de grafos o de referencias para el corpus están incompletas.');
  if (graphs.length !== graphIndex.length) throw new HttpError(503, 'La cantidad de grafos no coincide con su índice.');
  const ids = new Set();
  for (let i = 0; i < graphIndex.length; i++) {
    const graph = graphIndex[i], item = graphs[i];
    if (!graph?.id || !graph?.file || ids.has(graph.id) || item?.graph?.id !== graph.id || item.graph.file !== graph.file ||
      !Array.isArray(item?.data?.NODES) || !Array.isArray(item?.data?.EDGES) || !item?.data?.FIELDS)
      throw new HttpError(503, `Fuente de grafo inválida en posición ${i + 1}.`);
    ids.add(graph.id);
  }
  validarReferenciasGrafos(graphs,refsIndex);
  if (!Array.isArray(editorial?.constructor?.intents) || !Array.isArray(editorial?.constructor?.classifications) || !editorial?.constructor?.relations || !Array.isArray(editorial?.bot?.topics) || !Array.isArray(editorial?.fase?.topics))
    throw new HttpError(503, 'Faltan las fuentes editoriales del Labo en la base.');
}
export async function leerSnapshot(db = getPool(), {loadBundle = buildBundle} = {}) {
  const conn = await db.getConnection();
  let started = false;
  try {
    await conn.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await conn.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY'); started = true;
    const bundle = await loadBundle(conn);
    const rows = await conn.query('SELECT clave, contenido FROM documentos WHERE clave IN (?, ?, ?)', [TEXTO_KEY, GRAFOS_KEY, EDITORIAL_KEY]);
    const docs = Object.fromEntries(rows.map(r => [r.clave, parseJson(r.contenido)]));
    const g = docs[GRAFOS_KEY] || {};
    const snapshot = {tags:bundle.tags, estatico:bundle.estatico, funcional:bundle.funcional,
      textRaw:docs[TEXTO_KEY], refsIndex:g.refsIndex, graphIndex:g.graphIndex, graphs:g.graphs, editorial:docs[EDITORIAL_KEY]};
    validarFuentes(snapshot);
    await conn.commit(); started = false;
    return snapshot;
  } catch (err) {
    if (started) await conn.rollback().catch(() => {});
    throw err;
  } finally { conn.release(); }
}
