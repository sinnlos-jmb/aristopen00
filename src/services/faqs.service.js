import { getPool, withTransaction } from '../utils/db.js';
import { notFound, conflict, unprocessable, badRequest } from '../utils/http-error.js';
import * as faqsRepo from '../repositories/faqs.repository.js';
import * as trayectosRepo from '../repositories/trayectos.repository.js';
import * as argumentosRepo from '../repositories/argumentos.repository.js';
import * as relacionesRepo from '../repositories/relaciones.repository.js';
import { invalidateContenido } from './contenido.service.js';

const ID = /^faq\.[a-z0-9_]+(\.[a-z0-9_]+)*$/;
const ROLES = ['responde', 'contexto', 'matiza'];
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!.,;:«»"']/g, '').replace(/\s+/g, ' ').trim();

export function validateFaq(faq) {
  const errores = [];
  if (!faq || typeof faq !== 'object' || Array.isArray(faq)) return ['El cuerpo debe ser un objeto FAQ.'];
  if (typeof faq.id !== 'string' || !ID.test(faq.id)) errores.push('id inválido: usar «faq.tema.subtema» (minúsculas, números y _).');
  if (typeof faq.pregunta !== 'string' || !faq.pregunta.trim()) errores.push('Falta la pregunta.');
  else if (faq.pregunta.length > 500) errores.push('La pregunta supera los 500 caracteres.');
  if (faq.variantes !== undefined) {
    if (!Array.isArray(faq.variantes) || faq.variantes.some(v => typeof v !== 'string' || !v.trim())) {
      errores.push('variantes debe ser una lista de textos no vacíos.');
    } else {
      const seen = new Set();
      for (const v of faq.variantes) {
        if (seen.has(norm(v))) errores.push(`Variante repetida: «${v}».`);
        seen.add(norm(v));
      }
    }
  }
  if (faq.pasajes !== undefined) {
    if (!Array.isArray(faq.pasajes)) errores.push('pasajes debe ser una lista.');
    else faq.pasajes.forEach((p, i) => {
      if (!p || typeof p.ref !== 'string' || !p.ref.trim()) errores.push(`pasaje ${i + 1}: falta ref.`);
      if (!ROLES.includes(p?.rol)) errores.push(`pasaje ${i + 1}: rol debe ser ${ROLES.join(', ')}.`);
    });
  }
  for (const k of ['firmas', 'tambien', 'respuesta']) {
    if (faq[k] !== undefined && !Array.isArray(faq[k])) errores.push(`${k} debe ser una lista.`);
  }
  if (faq.arbol !== undefined && (typeof faq.arbol !== 'object' || Array.isArray(faq.arbol))) errores.push('arbol debe ser un objeto.');
  return errores;
}

export async function check(db, faq) {
  const errores = validateFaq(faq);
  if (faq?.argumento && !(await argumentosRepo.exists(db, faq.argumento))) errores.push(`El argumento «${faq.argumento}» no existe.`);
  if (errores.length) throw unprocessable('La FAQ tiene errores.', errores);
}

export async function list() {
  const faqs = await faqsRepo.listFaqs(getPool());
  return faqs.map(f => ({ id: f.id, pregunta: f.pregunta, estado: f.estado ?? null,
    curada: !!f.trayecto_curado, variantes: f.variantes.length, pasajes: f.pasajes.length }));
}

export async function get(id) {
  const db = getPool();
  const faq = await faqsRepo.getFaq(db, id);
  if (!faq) throw notFound(`No existe la FAQ ${id}.`);
  const trayectos = await trayectosRepo.listTrayectos(db, { faqId: id, meta: true });
  return { faq, trayectos: trayectos.map(t => ({ id: t.id, estado: t.estado, version: t.version,
    pasos: t.pasos.length, actualizado: t.actualizado, publicado_en: t.publicado_en })) };
}

export async function create(faq) {
  const result = await withTransaction(async conn => {
    await check(conn, faq);
    if (await faqsRepo.exists(conn, faq.id)) throw conflict(`Ya existe la FAQ ${faq.id}.`);
    await faqsRepo.insertFaq(conn, faq, await faqsRepo.nextOrden(conn));
    return faqsRepo.getFaq(conn, faq.id);
  });
  invalidateContenido();
  return result;
}

export async function update(id, body) {
  if (body?.id !== undefined && body.id !== id) throw badRequest('El id del cuerpo no coincide con el de la ruta.');
  const faq = { ...body, id };
  const result = await withTransaction(async conn => {
    await check(conn, faq);
    if (!(await faqsRepo.exists(conn, id))) throw notFound(`No existe la FAQ ${id}.`);
    await faqsRepo.replaceFaq(conn, faq);
    return faqsRepo.getFaq(conn, id);
  });
  invalidateContenido();
  return result;
}

export async function remove(id) {
  await withTransaction(async conn => {
    if (!(await faqsRepo.exists(conn, id))) throw notFound(`No existe la FAQ ${id}.`);
    const trayectos = await trayectosRepo.listTrayectos(conn, { faqId: id });
    if (trayectos.length) throw conflict('La FAQ tiene trayectos; borralos o archivalos antes.', trayectos.map(t => t.id));
    const destinos = await relacionesRepo.relacionesHaciaFaq(conn, id);
    if (destinos.length) {
      throw conflict('Hay relaciones del corpus con destino en esta FAQ; cambialas antes de borrarla.',
        destinos.map(d => `${d.subunidad_id} · relación ${d.orden + 1}`));
    }
    await faqsRepo.deleteFaq(conn, id);
  });
  invalidateContenido();
}
