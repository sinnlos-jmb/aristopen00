import { resolvePasajeRef, entrySubOfFaq, etapaSubs, expandStep } from '../bot/graph.js';
import { normalize } from '../bot/detect.js';
import { buildAllTrajectories } from './trajectories.js';

const record = value => value && typeof value === 'object' && !Array.isArray(value);

export function validateManual(manual, S) {
  const issues = [];
  const add = (path, message) => issues.push({ severity: 'error', path, message });
  if (!record(manual)) return [{ severity: 'error', path: 'manual', message: 'El manual debe ser un objeto JSON.' }];
  for (const section of ['por_concepto', 'por_subunidad', 'por_arista', 'notas_laterales']) {
    if (manual[section] !== undefined && !record(manual[section])) {
      add(section, 'La sección debe ser un objeto.');
      continue;
    }
    for (const [id, entry] of Object.entries(manual[section] || {})) {
      const path = `${section}.${id}`;
      if (!record(entry)) { add(path, 'La entrada debe ser un objeto.'); continue; }
      if (section === 'por_concepto' && !S.N?.[id] && !S.FN?.[id]) add(path, 'Concepto inexistente.');
      if (section === 'por_subunidad') {
        // Un paso puede ser un atómico (S.SUB[id]) o un paso fusionado cuya
        // expansión cubre ≥1 atómico (Fase B, step={ids:[...]} / ID Bekker fusionado).
        const isAtomic = !!S.SUB[id];
        const isFused = !isAtomic && expandStep(S, id).length > 0;
        if (!isAtomic && !isFused) add(path, 'Subunidad inexistente.');
        if (isFused && entry.ids !== undefined) {
          const covered = expandStep(S, id);
          if (!Array.isArray(entry.ids) || entry.ids.some(v => typeof v !== 'string' || !S.SUB[v])) {
            add(`${path}.ids`, 'Debe ser una lista de sub-unidades atómicas existentes.');
          } else if (entry.ids.join(',') !== covered.join(',')) {
            add(`${path}.ids`, `Los ids no coinciden con la expansión del paso (${covered.join(', ')}).`);
          }
        }
      }
      if (section === 'por_arista') {
        const ids = id.split('--');
        const existe = (c) => !!S.N?.[c] || !!S.FN?.[c] || !!S.SUB[c] || expandStep(S, c).length > 0;
        if (ids.length !== 2 || ids.some(c => !existe(c))) add(path, 'La transición debe unir dos conceptos o sub-unidades existentes (de--a).');
      }
      for (const field of ['apertura', 'definicion_corta', 'mapa_obra', 'exposicion', 'ejemplo', 'cita', 'transicion', 'texto', 'titulo', 'ref']) {
        if (entry[field] !== undefined && typeof entry[field] !== 'string') add(`${path}.${field}`, 'Debe ser texto.');
      }
      for (const field of ['notas_laterales', 'subs', 'conceptos']) {
        if (entry[field] === undefined) continue;
        if (!Array.isArray(entry[field]) || entry[field].some(v => typeof v !== 'string')) {
          add(`${path}.${field}`, 'Debe ser una lista de identificadores.'); continue;
        }
        for (const ref of entry[field]) {
          const exists = field === 'notas_laterales' ? manual.notas_laterales?.[ref]
            : field === 'subs' ? S.SUB[ref] : S.N?.[ref] || S.FN?.[ref];
          if (!exists) add(`${path}.${field}`, `Referencia inexistente: ${ref}.`);
        }
      }
      if (section === 'notas_laterales' && (typeof entry.texto !== 'string' || !entry.texto.trim())) add(path, 'La nota necesita texto.');
    }
  }
  return issues;
}

export function auditCorpus(S, trajectoryResult = buildAllTrajectories(S)) {
  const issues = [];
  const add = (severity, path, message) => issues.push({ severity, path, message });
  const concept = ref => !!(S.N?.[String(ref).split('#')[0]] || S.FN?.[String(ref).split('#')[0]]);
  for (const [name, nodes] of [['estatico', S.N], ['funcional', S.FN]]) {
    if (!nodes) add('error', name, 'Estructura ausente.');
  }
  const checkDuplicates = (items, path) => {
    const seen = new Set();
    for (const item of items || []) {
      if (!item.id || seen.has(item.id)) add('error', path, `ID ausente o duplicado: ${item.id || '—'}.`);
      seen.add(item.id);
    }
  };
  const flatten = (nodes, child) => (nodes || []).flatMap(n => [n, ...flatten(n[child], child)]);
  checkDuplicates(S.repo.unidades(), 'unidades');
  checkDuplicates(S.repo.subunidades(), 'subunidades');
  checkDuplicates(S.repo.faqs(), 'faqs');
  checkDuplicates(S.repo.definiciones(), 'definiciones');
  checkDuplicates(flatten(S.tree?.raices, 'hijos'), 'estatico');
  checkDuplicates(flatten(S.ftree?.categorias, 'hijos'), 'funcional');
  for (const [id, node] of Object.entries(S.FN || {})) {
    if (!S.NODE_UNIT?.[id]) add('warning', `funcional.${id}`, 'Sin subunidad ancla; puede omitirse al componer la respuesta.');
    for (const ref of node.remite_a || []) if (!concept(ref)) add('error', `funcional.${id}`, `Remisión inexistente: ${ref}.`);
  }
  for (const edge of S.FE || []) {
    if (!S.FN?.[edge.de] || !S.FN?.[edge.a]) add('error', `aristas.${edge.de}--${edge.a}`, 'Arista con extremo inexistente.');
    if (!edge.ref) add('info', `aristas.${edge.de}--${edge.a}`, 'Sin referencia textual; revisar el fundamento interpretativo.');
    if (!['textual', 'comentarista', 'nuestra'].includes(edge.voz)) add('warning', `aristas.${edge.de}--${edge.a}`, 'Voz ausente o desconocida.');
  }
  for (const [id, sub] of Object.entries(S.SUB)) {
    if (!sub.conceptos_clave?.length) add('warning', `sub.${id}`, 'Sin conceptos clave.');
    for (const c of sub.conceptos_clave || []) if (!concept(c)) add('error', `sub.${id}`, `Concepto inexistente: ${c}.`);
  }
  const variants = new Map();
  for (const faq of S.repo.faqs()) {
    if (!entrySubOfFaq(S, faq.id)) {
      if (faq.exposicion_directa && faq.respuesta?.some(r => r.rol === 'responde' && r.t && r.ref)) add('info', faq.id, 'Respuesta directa con referencia textual, aún sin subdivisión tagueada.');
      else add('error', faq.id, 'Sin pasaje de respuesta resoluble.');
    }
    if (!faq.arbol?.nodo || !concept(faq.arbol.nodo)) add('warning', faq.id, 'Sin foco principal válido.');
    for (const p of faq.pasajes || []) if (!resolvePasajeRef(S, p.ref)) add('error', faq.id, `Pasaje no resoluble: ${p.ref}.`);
    for (const f of faq.firmas || []) for (const arg of f.arguments || []) {
      const [type, value] = String(arg).split(/:(.*)/s);
      const ids = (value || '').split('#')[0].split('--');
      if (!['func', 'static', 'sense', 'fedge'].includes(type) || ids.some(c => !concept(c))) add('error', faq.id, `Argumento de firma inválido: ${arg}.`);
      if (type === 'fedge' && !S.FE?.some(e => e.de === ids[0] && e.a === ids[1] || e.de === ids[1] && e.a === ids[0])) add('warning', faq.id, `Arista de firma no registrada: ${arg}.`);
      if (type === 'sense') {
        // Tolerar 0 o 2+ '#' sin perder el tail; mirar también conceptos funcionales (S.FN).
        const hash = (value || '').indexOf('#');
        const id = hash >= 0 ? value.slice(0, hash) : (value || '');
        const sense = hash >= 0 ? value.slice(hash + 1) : null;
        const sentidos = S.N?.[id]?.sentidos || S.FN?.[id]?.sentidos;
        if (!sense || !sentidos?.some(s => s.id === sense)) add('warning', faq.id, `Sentido no registrado: ${arg}.`);
      }
    }
    for (const text of [faq.pregunta, ...(faq.variantes || [])]) {
      const key = normalize(text);
      if (!variants.has(key)) variants.set(key, new Set());
      variants.get(key).add(faq.id);
    }
  }
  for (const [text, ids] of variants) if (ids.size > 1) add('warning', 'variantes', `«${text}» se comparte entre ${[...ids].join(', ')}.`);
  for (const d of Object.values(S.DEF || {})) {
    if (!concept(d.concepto)) add('error', d.id, 'Concepto de definición inexistente.');
    for (const stage of d.etapas || []) if (!etapaSubs(S, stage).length) add('warning', d.id, `Etapa sin pasaje resoluble: ${stage.label || stage.a}.`);
  }
  issues.push(...validateManual(S.manual || {}, S));
  // D4 (Fase C): borradores del manual pendientes de revisión editorial (metadata, no error).
  const borradores = [
    ...Object.entries(S.manual?.por_subunidad || {}).filter(([, e]) => e?.borrador).map(([id]) => `por_subunidad.${id}`),
    ...Object.entries(S.manual?.por_arista || {}).filter(([, e]) => e?.borrador).map(([id]) => `por_arista.${id}`),
  ];
  if (borradores.length) add('info', 'manual', `${borradores.length} entradas con «borrador: true» pendientes de revisión editorial: ${borradores.join(', ')}.`);
  // D1 (Fase C, data-B10): unidades sin sub-unidades, report-only.
  const vacias = S.repo.unidades().filter(u => !(u.subunidades || []).length).map(u => u.id);
  if (vacias.length) add('info', 'unidades', `Unidades sin sub-unidades (refs hacia ellas no resuelven; data-B10): ${vacias.join(', ')}.`);
  if (trajectoryResult.error) add('error', 'trayectorias', trajectoryResult.error);
  const reviews = trajectoryResult.trajectories.map(t => {
    const best = t.candidates[0];
    if (!best) add('error', t.faq.id, 'El buscador, con sus límites actuales de profundidad y candidatos, no encontró una trayectoria que cubra el foco principal.');
    else {
      if (!best.primaryCovered) add('error', t.faq.id, 'Trayectoria sin foco principal.');
      if (best.uncovered.length) add('warning', t.faq.id, `Focos sin cubrir: ${best.uncovered.map(c => c.id).join(', ')}.`);
    }
    return { faq: t.faq.id, question: t.faq.pregunta, path: best?.path || [],
      score: best?.total ?? null, primaryCovered: best?.primaryCovered || false,
      uncovered: best?.uncovered.map(c => c.id) || [], reversed: best?.reversed || 0,
      voices: best?.edges.map(e => e.edge.voz) || [] };
  });
  return { summary: { errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length, info: issues.filter(i => i.severity === 'info').length }, issues, reviews };
}
