// Contenido completo para el front, con la misma forma que los archivos JSON
// (tags, manual, argumentos, funcional, estatico, trayectos). Se arma desde la base.
import { getPool } from '../utils/db.js';
import { avisarInvalidacionContenido } from '../utils/invalidacion.js';
import { orderKeys } from '../utils/record.js';
import * as unidadesRepo from '../repositories/unidades.repository.js';
import * as faqsRepo from '../repositories/faqs.repository.js';
import * as trayectosRepo from '../repositories/trayectos.repository.js';
import * as manualRepo from '../repositories/manual.repository.js';
import * as argumentosRepo from '../repositories/argumentos.repository.js';
import * as documentosRepo from '../repositories/documentos.repository.js';
import * as conceptosRepo from '../repositories/conceptos.repository.js';

let cache = null; // { bundle, at, expires }
let generation = 0;
const CACHE_MS = 5000; // acota la antigüedad entre procesos o cambios directos en la base

export function invalidateContenido() {
  cache = null;
  generation++;
  avisarInvalidacionContenido();
}

const strip = (docs, prefix) => Object.fromEntries(
  Object.entries(docs).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));

export async function buildBundle(db = getPool(), { estados = ['publicado'] } = {}) {
  const [docs, estatico, unidades, faqs, manual, argumentos, trayectos] = await Promise.all([
    documentosRepo.getDocumentos(db),
    conceptosRepo.getEstatico(db),
    unidadesRepo.listUnidades(db),
    faqsRepo.listFaqs(db),
    manualRepo.getSecciones(db),
    argumentosRepo.listArgumentos(db),
    trayectosRepo.listTrayectos(db),
  ]);
  // Orden de las claves de cada archivo (solo presentación: los archivos exportados quedan iguales).
  const orden = docs['orden.claves'] || {};
  return {
    tags: orderKeys({ ...strip(docs, 'tags.'), unidades, faqs }, orden.tags || []),
    manual: orderKeys({ ...(docs['manual.meta'] || {}), ...manual }, orden.manual || []),
    argumentos: orderKeys({ ...(docs['argumentos.meta'] || {}), argumentos }, orden.argumentos || []),
    funcional: docs.funcional ?? null,
    estatico,
    trayectos: orderKeys({ ...(docs['trayectos.meta'] || {}), trayectos: trayectos.filter(t => estados.includes(t.estado)) }, orden.trayectos || []),
  };
}

export async function getContenido() {
  if (cache && Date.now() < cache.expires) return cache;
  const startGeneration = generation;
  const bundle = await buildBundle();
  const result = { bundle, at: new Date().toISOString(), expires: Date.now() + CACHE_MS };
  // Si una edición invalidó mientras leíamos, no volvemos a guardar datos antiguos.
  if (generation === startGeneration) cache = result;
  return result;
}

// Deshabilitado: el reemplazo global anterior eliminaba todos los documentos,
// incluidas fuentes editoriales que no reconstruía. No ejecutar importaciones
// antiguas de archivos: las actualizaciones de la base deben ser específicas.
export async function replaceAll() {
  throw new Error('Reemplazo total deshabilitado: usar una actualización controlada de la base.');
}
