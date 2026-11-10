// Ciclo editorial de los trayectos: borrador → publicado → archivado.
// Usa la misma validación que el front (public/js/content/trayecto.js).
import { getPool, withTransaction } from '../utils/db.js';
import { notFound, conflict, unprocessable } from '../utils/http-error.js';
import { trayectoModel } from '../utils/shared.js';
import * as trayectosRepo from '../repositories/trayectos.repository.js';
import * as faqsRepo from '../repositories/faqs.repository.js';
import * as unidadesRepo from '../repositories/unidades.repository.js';
import * as manualRepo from '../repositories/manual.repository.js';
import { invalidateContenido } from './contenido.service.js';

const { normalizeTrayecto, validateTrayecto } = trayectoModel;

const rawSubIds = raw => (Array.isArray(raw?.pasos) ? raw.pasos : []).flatMap(p =>
  typeof p === 'string' ? [p] : [].concat(p?.subunidades ?? p?.subUnidad ?? p?.sub ?? []));

// Contexto mínimo (con la forma de S del front) para normalizar y validar.
async function contexto(db, faq, raw) {
  const SUB = await unidadesRepo.findSubunidades(db, rawSubIds(raw));
  const notas = await manualRepo.existingNotas(db, (raw?.pasos || []).flatMap(p => p?.notas_laterales || []));
  return { FAQ: { [faq.id]: faq }, SUB, NODE_UNIT: {}, manual: { notas_laterales: notas } };
}

async function prepare(db, faqId, raw) {
  const faq = await faqsRepo.getFaq(db, faqId);
  if (!faq) throw notFound(`No existe la FAQ ${faqId}.`);
  const S = await contexto(db, faq, raw);
  const t = normalizeTrayecto({ ...raw, faq: faqId }, S);
  // Un borrador puede estar incompleto, pero no puede apuntar a subunidades inexistentes.
  const faltantes = [...new Set(t.pasos.flatMap(p => p.subunidades).filter(id => !S.SUB[id]))];
  if (faltantes.length) throw unprocessable('Hay subunidades que no existen.', faltantes);
  return { t, S };
}

const withReport = (t, S) => ({ trayecto: t, ...validateTrayecto(t, S) });

export async function listByFaq(faqId) {
  const db = getPool();
  if (!(await faqsRepo.exists(db, faqId))) throw notFound(`No existe la FAQ ${faqId}.`);
  return trayectosRepo.listTrayectos(db, { faqId, meta: true });
}

export async function list({ estado } = {}) {
  return trayectosRepo.listTrayectos(getPool(), { estado, meta: true });
}

export async function get(id) {
  const db = getPool();
  const t = await trayectosRepo.getTrayecto(db, id);
  if (!t) throw notFound(`No existe el trayecto ${id}.`);
  const faq = await faqsRepo.getFaq(db, t.faq);
  return withReport(t, await contexto(db, faq, t));
}

// Variantes "In": trabajan dentro de una transacción ajena (las usa la importación de FAQ).
export async function createDraftIn(conn, faqId, raw, { origen = 'editor' } = {}) {
  const { t, S } = await prepare(conn, faqId, raw);
  const version = await trayectosRepo.nextVersion(conn, faqId);
  const draft = { ...t, id: `tr.${faqId}.v${version}`, estado: 'borrador', version,
    titulo: t.titulo || S.FAQ[faqId].pregunta, origen: t.origen || origen };
  await trayectosRepo.insertTrayecto(conn, draft);
  return withReport(await trayectosRepo.getTrayecto(conn, draft.id), S);
}

export async function createDraft(faqId, raw) {
  return withTransaction(conn => createDraftIn(conn, faqId, raw));
}

export async function updateDraft(id, raw) {
  return withTransaction(async conn => {
    const current = await trayectosRepo.getTrayecto(conn, id, { forUpdate: true });
    if (!current) throw notFound(`No existe el trayecto ${id}.`);
    if (current.estado !== 'borrador') throw conflict(`Solo se editan borradores; ${id} está ${current.estado}. Creá un borrador nuevo.`);
    const { t, S } = await prepare(conn, current.faq, raw);
    await trayectosRepo.updateTrayecto(conn, { ...t, id, titulo: t.titulo || current.titulo, origen: t.origen || current.origen });
    return withReport(await trayectosRepo.getTrayecto(conn, id), S);
  });
}

export async function publishIn(conn, id) {
  const t = await trayectosRepo.getTrayecto(conn, id, { forUpdate: true });
  if (!t) throw notFound(`No existe el trayecto ${id}.`);
  if (t.estado === 'publicado') throw conflict(`${id} ya está publicado.`);
  const faq = await faqsRepo.getFaq(conn, t.faq);
  const S = await contexto(conn, faq, t);
  const { errores, avisos } = validateTrayecto(t, S);
  if (errores.length) throw unprocessable('El trayecto tiene errores y no se puede publicar.', errores);
  await trayectosRepo.publish(conn, id, t.faq);
  return { trayecto: await trayectosRepo.getTrayecto(conn, id), errores: [], avisos };
}

export async function publish(id) {
  const result = await withTransaction(conn => publishIn(conn, id));
  invalidateContenido();
  return result;
}

export async function remove(id) {
  return withTransaction(async conn => {
    const t = await trayectosRepo.getTrayecto(conn, id, { forUpdate: true });
    if (!t) throw notFound(`No existe el trayecto ${id}.`);
    if (t.estado === 'publicado') throw conflict('No se puede borrar el trayecto publicado; publicá otro primero.');
    await trayectosRepo.deleteTrayecto(conn, id);
  });
}
