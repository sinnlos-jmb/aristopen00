// Importación de FAQ desde JSON (en lugar de un formulario).
//
// Entrada: una lista de FAQ o { faqs: [...] }, con la misma forma que tags_v4.json → faqs.
// Cada FAQ puede traer `trayecto` (pasos con subunidades y textos); con `trayecto.publicar: true`
// se publica si no tiene errores. Modos:
//   crear               solo altas; si alguna FAQ ya existe, es un error
//   actualizar          solo FAQ existentes (reemplazo completo de la FAQ)
//   crear-o-actualizar  altas y reemplazos
//
// Es todo o nada: si una FAQ tiene errores no se guarda ninguna. Con `dryRun` se hace todo
// el trabajo dentro de la transacción y al final se deshace: sirve para validar un archivo.
import { isDeepStrictEqual } from 'node:util';
import { getPool } from '../utils/db.js';
import { badRequest, HttpError } from '../utils/http-error.js';
import { storeModel, graphModel, detectModel } from '../utils/shared.js';
import * as faqsRepo from '../repositories/faqs.repository.js';
import * as trayectosRepo from '../repositories/trayectos.repository.js';
import { check } from './faqs.service.js';
import { createDraftIn, publishIn } from './trayectos.service.js';
import { buildBundle, invalidateContenido } from './contenido.service.js';

export const MODOS = ['crear', 'actualizar', 'crear-o-actualizar'];
const MAX = 500;
const FIRMA_TIPOS = ['func', 'static', 'sense', 'fedge'];

export function leerLote(body) {
  const items = Array.isArray(body) ? body : Array.isArray(body?.faqs) ? body.faqs : null;
  if (!items) throw badRequest('Se espera una lista de FAQ o un objeto { "faqs": [...] }.');
  if (!items.length) throw badRequest('La lista de FAQ está vacía.');
  if (items.length > MAX) throw badRequest(`Máximo ${MAX} FAQ por importación.`);
  return items;
}

const mensajes = err => {
  if (err instanceof HttpError) {
    const det = [].concat(err.details ?? []).map(String);
    if (!det.length) return [err.message];
    if (err.message === 'La FAQ tiene errores.') return det;
    return [`${err.message.replace(/\.$/, '')}: ${det.join(', ')}.`];
  }
  if (err?.sqlMessage) return [`Base de datos: ${err.sqlMessage}`];
  throw err; // error inesperado: aborta la importación entera
};

// Controles que necesitan el contenido completo (corpus, grafos, otras FAQ).
function controlesDeContenido(S, faq, importadas) {
  const { resolvePasajeRef, entrySubOfFaq } = graphModel;
  const errores = [];
  const avisos = [];
  const concepto = ref => !!(S.N?.[String(ref).split('#')[0]] || S.FN?.[String(ref).split('#')[0]]);

  for (const p of faq.pasajes || []) if (!resolvePasajeRef(S, p.ref)) errores.push(`Pasaje no resoluble: ${p.ref}.`);
  if (!entrySubOfFaq(S, faq.id) && !(faq.exposicion_directa && faq.respuesta?.some(r => r.rol === 'responde' && r.t && r.ref))) {
    errores.push('Ningún pasaje con rol «responde» apunta a una subunidad: el bot no sabría por dónde entrar.');
  }
  for (const f of faq.firmas || []) {
    for (const arg of f?.arguments || []) {
      const [tipo, valor] = String(arg).split(/:(.*)/s);
      const ids = (valor || '').split('#')[0].split('--');
      if (!FIRMA_TIPOS.includes(tipo) || ids.some(c => !concepto(c))) errores.push(`Argumento de firma inválido: ${arg}.`);
    }
  }
  if (!faq.arbol?.nodo || !concepto(faq.arbol.nodo)) avisos.push('Sin foco principal válido (arbol.nodo).');
  for (const t of faq.tambien || []) if (t?.nodo && !concepto(t.nodo)) avisos.push(`«tambien» apunta a un concepto inexistente: ${t.nodo}.`);
  if (faq.definicion && !S.DEF?.[faq.definicion]) avisos.push(`La definición «${faq.definicion}» no existe.`);

  const norm = detectModel.normalize;
  const propias = new Set([faq.pregunta, ...(faq.variantes || [])].map(norm));
  for (const otra of S.repo.faqs()) {
    if (otra.id === faq.id) continue;
    const comunes = [otra.pregunta, ...(otra.variantes || [])].filter(v => propias.has(norm(v)));
    if (comunes.length) {
      avisos.push(`Comparte ${comunes.length === 1 ? 'la variante' : 'variantes'} ${comunes.map(v => `«${v}»`).join(', ')} con ${otra.id}${importadas.has(otra.id) ? ' (también importada)' : ''}.`);
    }
  }
  return { errores, avisos };
}

// Crea el borrador; si es igual a un trayecto existente de la FAQ, lo descarta y reutiliza ese.
async function importarTrayecto(conn, faqId, raw) {
  const { publicar = false, ...datos } = raw;
  const res = await createDraftIn(conn, faqId, datos, { origen: 'importación JSON' });
  const nuevo = res.trayecto;
  const previos = (await trayectosRepo.listTrayectos(conn, { faqId })).filter(t => t.id !== nuevo.id && t.estado !== 'archivado');
  const igual = previos.find(t => isDeepStrictEqual(t.pasos, nuevo.pasos));
  let trayecto = nuevo;
  let accion = 'borrador';
  if (igual) {
    await trayectosRepo.deleteTrayecto(conn, nuevo.id);
    trayecto = igual;
    accion = 'sin_cambios';
  }
  const out = { id: trayecto.id, accion, estado: trayecto.estado, pasos: trayecto.pasos.length, errores: res.errores, avisos: res.avisos };
  if (publicar && trayecto.estado !== 'publicado') {
    if (res.errores.length) {
      out.errores = [...res.errores, 'No se puede publicar: corregí los errores o quitá «publicar».'];
    } else {
      await publishIn(conn, trayecto.id);
      Object.assign(out, { estado: 'publicado', accion: 'publicado' });
    }
  }
  return out;
}

export async function importar(body, { modo = 'crear', dryRun = false } = {}, pool = getPool()) {
  if (!MODOS.includes(modo)) throw badRequest(`Modo inválido: ${modo}. Opciones: ${MODOS.join(', ')}.`);
  const items = leerLote(body);
  const informe = items.map((item, i) => ({
    indice: i,
    id: typeof item?.id === 'string' ? item.id : null,
    accion: null,
    errores: [],
    avisos: [],
  }));

  // 1. Controles sin base: forma de cada FAQ e ids repetidos dentro del archivo.
  const vistos = new Map();
  items.forEach((item, i) => {
    const r = informe[i];
    if (item && typeof item === 'object' && 'trayecto_curado' in item) r.avisos.push('Se ignora «trayecto_curado»: se deriva de tener un trayecto publicado.');
    if (item?.trayecto !== undefined && (typeof item.trayecto !== 'object' || item.trayecto === null || Array.isArray(item.trayecto))) {
      r.errores.push('«trayecto» debe ser un objeto con «pasos».');
    }
    if (r.id && vistos.has(r.id)) r.errores.push(`id repetido en el archivo (también en la posición ${vistos.get(r.id) + 1}).`);
    else if (r.id) vistos.set(r.id, i);
  });

  const conn = await pool.getConnection();
  let confirmado = false;
  try {
    await conn.beginTransaction();

    // 2. Escritura de cada FAQ (dentro de la transacción).
    for (const [i, item] of items.entries()) {
      const r = informe[i];
      if (r.errores.length) continue;
      const { trayecto, trayecto_curado, ...faq } = item || {};
      try {
        await check(conn, faq);
        const antes = await faqsRepo.getFaq(conn, faq.id);
        if (antes && modo === 'crear') { r.errores.push('Ya existe. Para reemplazarla usá el modo «actualizar» o «crear-o-actualizar».'); continue; }
        if (!antes && modo === 'actualizar') { r.errores.push('No existe. Para darla de alta usá el modo «crear» o «crear-o-actualizar».'); continue; }
        if (antes) {
          await faqsRepo.replaceFaq(conn, faq);
          const { trayecto_curado: _a, ...previa } = antes;
          const { trayecto_curado: _b, ...nueva } = await faqsRepo.getFaq(conn, faq.id);
          r.accion = isDeepStrictEqual(previa, nueva) ? 'sin_cambios' : 'actualizada';
        } else {
          await faqsRepo.insertFaq(conn, faq, await faqsRepo.nextOrden(conn));
          r.accion = 'creada';
        }
      } catch (err) {
        r.errores.push(...mensajes(err));
      }
    }

    // 3. Controles de contenido, con todas las FAQ del lote ya escritas (pueden citarse entre sí).
    const ok = informe.filter(r => r.accion);
    if (ok.length) {
      const bundle = await buildBundle(conn);
      const S = storeModel.buildStore(bundle.tags, bundle);
      const importadas = new Set(ok.map(r => r.id));
      for (const r of ok) {
        const c = controlesDeContenido(S, S.FAQ[r.id], importadas);
        r.errores.push(...c.errores);
        r.avisos.push(...c.avisos);
      }
    }

    // 4. Trayectos (necesitan la FAQ guardada).
    for (const [i, item] of items.entries()) {
      const r = informe[i];
      if (!r.accion || r.errores.length || !item.trayecto) continue;
      try {
        r.trayecto = await importarTrayecto(conn, r.id, item.trayecto);
        if (r.trayecto.errores.length && item.trayecto.publicar) r.errores.push('El trayecto no se pudo publicar (ver trayecto.errores).');
      } catch (err) {
        r.errores.push(...mensajes(err).map(m => `Trayecto: ${m}`));
      }
    }

    const conErrores = informe.filter(r => r.errores.length).length;
    if (!dryRun && !conErrores) {
      await conn.commit();
      confirmado = true;
      invalidateContenido();
    } else {
      await conn.rollback();
    }
    const cuenta = accion => informe.filter(r => r.accion === accion).length;
    return {
      ok: conErrores === 0,
      dryRun,
      modo,
      guardado: confirmado,
      resumen: {
        total: items.length,
        creadas: cuenta('creada'),
        actualizadas: cuenta('actualizada'),
        sin_cambios: cuenta('sin_cambios'),
        con_errores: conErrores,
        trayectos: informe.filter(r => r.trayecto && r.trayecto.accion !== 'sin_cambios').length,
        publicados: informe.filter(r => r.trayecto?.accion === 'publicado').length,
      },
      faqs: informe,
    };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}
