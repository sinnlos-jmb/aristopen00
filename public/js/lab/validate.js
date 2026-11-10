// Validación de integridad fail-fast entre las tres capas del corpus
// (argumentos.json · tags_v4.json · manual_v1.json). Cubre los fallos que el
// runtime traga en silencio (IDs fusionados descartados, refs sin resolver,
// unidades vacías) y los clasifica:
//   - error:   un ID no resuelve a nada conocido (rompe el motor hoy);
//   - warning: incidencia documentada en el backlog (Fase B: pasos fusionados
//              {ids:[...]}; Fase C: unidades sin sub-unidades, data-B10).
// Uso: import { validateIntegrity } from './lab/validate.js'
import { resolvePasajeRef, etapaSubs, expandStep } from '../bot/graph.js';

// Re-exportado desde graph.js (fuente única) para mantener compatibilidad.
export { expandStep };

const isFusedStep = (S, step) => typeof step === 'string' && !S.SUB?.[step] && expandStep(S, step).length > 0;

const unitOf = (S, ref) => {
  const str = String(ref || '');
  const uid = str.startsWith('unidad:') ? str.slice(7) : str.startsWith('u:') ? str.slice(2) : null;
  return uid ? S.U?.[uid] : null;
};

export function validateIntegrity(S) {
  const errors = [];
  const warnings = [];
  const add = (list, path, message) => list.push({ path, message });

  // — Capa argumentos: secuencias, hitos y definiciones --------------------
  for (const [id, arg] of Object.entries(S.argumentos?.argumentos || {})) {
    const base = `argumentos.${id}`;
    const secuencia = arg.secuencia || [];
    let expansion = [];
    for (const step of secuencia) {
      const covered = expandStep(S, step);
      if (!covered.length) {
        add(errors, `${base}.secuencia`, `Paso sin sub-unidades que lo cubran: ${JSON.stringify(step)}.`);
      } else {
        expansion.push(...covered);
        if (isFusedStep(S, step)) {
          // El paso fusionado tiene entidad narrativa propia. Si el manual ya
          // persiste su exposición (B5), la fusión está implementada; si no,
          // queda como alerta de higiene (borrador pendiente de revisión).
          const hasManual = !!S.manual?.por_subunidad?.[String(step)]?.exposicion;
          if (!hasManual) {
            add(warnings, `${base}.secuencia`, `Paso fusionado sin exposición en manual.por_subunidad: ${JSON.stringify(step)} → ${covered.join(', ')}.`);
          }
        }
      }
    }
    for (const hit of arg.hit_obligatorios || []) {
      const covered = expandStep(S, hit);
      if (!covered.length) {
        add(errors, `${base}.hit_obligatorios`, `Hito irresoluble: ${JSON.stringify(hit)}.`);
      } else if (secuencia.length && !covered.some(id => expansion.includes(id))) {
        add(errors, `${base}.hit_obligatorios`, `Hito ${JSON.stringify(hit)} fuera de la secuencia (hit_obligatorios ⊆ secuencia).`);
      }
    }
    // definicion_por_etapas se deriva de DEF[concepto] en el motor: si el
    // concepto no tiene definición, el trayecto cae al tour por defecto en
    // silencio (bot-B1). Aquí se corta por lo sano.
    if (!secuencia.length && arg.concepto && !S.DEFC?.[arg.concepto]?.length) {
      add(errors, `${base}.concepto`, `Sin definición para derivar etapas: ${arg.concepto}.`);
    }
  }

  // — Capa tags: FAQs y definiciones --------------------------------------
  for (const faq of S.repo.faqs()) {
    for (const p of faq.pasajes || []) {
      if (resolvePasajeRef(S, p.ref)) continue;
      const unit = unitOf(S, p.ref);
      if (unit) {
        add(warnings, `${faq.id}.pasajes`, `Ref ${JSON.stringify(p.ref)} apunta a la unidad «${unit.id}» sin sub-unidades (data-B10, Fase C).`);
      } else {
        add(errors, `${faq.id}.pasajes`, `Pasaje no resoluble: ${JSON.stringify(p.ref)}.`);
      }
    }
  }
  for (const def of Object.values(S.DEF || {})) {
    for (const etapa of def.etapas || []) {
      if (etapaSubs(S, etapa).length) continue;
      const unit = unitOf(S, etapa.a);
      if (unit) {
        add(warnings, `${def.id}.etapas`, `Etapa «${etapa.label || etapa.a}»: la unidad «${unit.id}» no tiene sub-unidades (data-B10, Fase C).`);
      } else if (String(etapa.a).startsWith('super:')) {
        add(warnings, `${def.id}.etapas`, `Etapa «${etapa.label || etapa.a}»: referencia externa ${JSON.stringify(etapa.a)} sin pasaje tagueado.`);
      } else {
        add(errors, `${def.id}.etapas`, `Etapa sin pasaje resoluble: ${etapa.label || etapa.a}.`);
      }
    }
  }

  // — Anclas duplicadas entre sub-unidades --------------------------------
  // Misma regla que anchors-check: dos inicios idénticos en castellano siempre
  // duplican el pasaje (error); en griego sólo chocan si resuelven al mismo
  // capítulo — si el castellano de cada sub-unidad las ubica en capítulos
  // distintos, la pista de capítulo las desambigua (advertencia, Fase C).
  const seenAnclas = new Map();
  for (const sub of Object.values(S.SUB || {})) {
    for (const lang of ['es', 'gr']) {
      const needle = sub[`${lang}_ancla`]?.inicio?.trim();
      if (!needle) continue;
      const key = `${lang} ${needle}`;
      const prev = seenAnclas.get(key);
      if (!prev) { seenAnclas.set(key, sub.id); continue; }
      const sameChapter = lang === 'es' || sub.es_ancla?.inicio?.trim() === (S.SUB[prev]?.es_ancla?.inicio?.trim() ?? null);
      if (sameChapter) add(errors, `sub.${sub.id}`, `Ancla ${lang}.inicio duplicada con ${prev}.`);
      else add(warnings, `sub.${sub.id}`, `Ancla ${lang}.inicio compartida con ${prev} (capítulos distintos; la pista las desambigua) — Fase C.`);
    }
  }

  return { errors, warnings };
}