// js/content/trayecto.js
// Modelo único de trayecto. Un trayecto es la regla explícita que responde una FAQ:
// una lista ordenada de pasos, cada uno con identidad propia y su contenido.
//
//   { id, faq, estado: 'publicado' | 'borrador', version, titulo, origen,
//     pasos: [{ id, subunidades: [subId…], titulo, bekker,
//               transicion_entrante, exposicion, ejemplo, cita, notas_laterales }] }
//
// La misma subunidad puede aparecer en varios trayectos (o varias veces en uno):
// el contenido pertenece al paso, no a la subunidad.

const str = v => (typeof v === 'string' ? v : '');
const list = v => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);

// Acepta el formato publicado (trayectos_v1.json) y el formato de borrador del
// editor del Lab (pasos + aristas paralelas, con `sub` / `subUnidad` / `nodo`).
// No descarta pasos: un paso sin subunidad resoluble queda y lo señala validateTrayecto.
export function normalizeTrayecto(raw, S, { estado } = {}) {
  if (!raw) return null;
  const rawPasos = Array.isArray(raw.pasos) ? raw.pasos : Array.isArray(raw.nodos) ? raw.nodos : [];
  const aristas = Array.isArray(raw.aristas) ? raw.aristas : [];
  const pasos = rawPasos.map((p, i) => {
    const paso = typeof p === 'string' ? { sub: p } : (p || {});
    let subs = list(paso.subunidades ?? paso.subUnidad ?? paso.sub ?? null).filter(Boolean);
    if (!subs.length && paso.nodo && S?.NODE_UNIT?.[paso.nodo]?.sub) subs = [S.NODE_UNIT[paso.nodo].sub];
    const sub0 = subs.length ? S?.SUB?.[subs[0]] : null;
    const transicion = paso.transicion_entrante ?? (i > 0 ? aristas[i - 1]?.transicion : '');
    return {
      id: str(paso.id) || `p${i + 1}`,
      subunidades: subs,
      titulo: str(paso.titulo) || sub0?.titulo || subs[0] || `Paso ${i + 1}`,
      bekker: list(paso.bekker).length ? list(paso.bekker) : (sub0?.bekker || []),
      transicion_entrante: str(transicion),
      exposicion: str(paso.exposicion),
      ejemplo: str(paso.ejemplo),
      cita: str(paso.cita),
      notas_laterales: list(paso.notas_laterales).map(n => (typeof n === 'string' ? n : n?.id)).filter(Boolean),
    };
  });
  return {
    id: str(raw.id),
    faq: str(raw.faq),
    estado: estado || str(raw.estado) || 'borrador',
    version: raw.version ?? null,
    titulo: str(raw.titulo),
    origen: str(raw.origen),
    pasos,
  };
}

// Devuelve { errores, avisos }. Con errores, el trayecto no se reproduce ni se publica.
export function validateTrayecto(t, S) {
  const errores = [];
  const avisos = [];
  if (!t) return { errores: ['Trayecto vacío.'], avisos };
  const where = (p, i) => `paso ${i + 1}${p?.id ? ` (${p.id})` : ''}`;
  if (!t.id) errores.push('El trayecto no tiene id.');
  if (!t.faq) errores.push('El trayecto no indica a qué FAQ responde.');
  else if (S?.FAQ && !S.FAQ[t.faq]) errores.push(`La FAQ «${t.faq}» no existe.`);
  if (!t.pasos?.length) errores.push('El trayecto no tiene pasos.');
  const ids = new Set();
  (t.pasos || []).forEach((p, i) => {
    if (ids.has(p.id)) errores.push(`${where(p, i)}: id de paso repetido.`);
    ids.add(p.id);
    if (!p.subunidades.length) errores.push(`${where(p, i)}: no está vinculado a ninguna subunidad.`);
    for (const sid of p.subunidades) {
      if (S?.SUB && !S.SUB[sid]) errores.push(`${where(p, i)}: la subunidad «${sid}» no existe.`);
    }
    if (!p.exposicion && !p.ejemplo && !p.cita) errores.push(`${where(p, i)}: no tiene contenido.`);
    if (i > 0 && !p.transicion_entrante) avisos.push(`${where(p, i)}: no tiene transición entrante.`);
    for (const nid of p.notas_laterales) {
      if (!S?.manual?.notas_laterales?.[nid]) errores.push(`${where(p, i)}: la nota lateral «${nid}» no existe.`);
    }
  });
  return { errores, avisos };
}

// Texto de un paso tal como lo ve el usuario: transición + exposición + ejemplo + cita.
export function composePaso(paso) {
  if (!paso) return '';
  return [paso.transicion_entrante, paso.exposicion, paso.ejemplo, paso.cita ? `«${paso.cita}»` : '']
    .filter(Boolean).join('\n\n');
}

// Coherencia del catálogo de trayectos con las FAQ. Devuelve { errors, warnings }
// con el mismo formato que lab/validate.js ({ path, message }).
export function validateCatalog(S) {
  const errors = [];
  const warnings = [];
  const add = (lst, path, message) => lst.push({ path, message });
  const porFaq = {};
  for (const raw of S.trayectosRaw?.trayectos || []) {
    const t = normalizeTrayecto(raw, S);
    const base = `trayectos.${t.id || '(sin id)'}`;
    if (!['publicado', 'borrador'].includes(raw?.estado)) add(errors, base, `Estado inválido: «${raw?.estado}».`);
    if (raw?.estado === 'publicado') (porFaq[t.faq] = porFaq[t.faq] || []).push(t.id);
    const { errores, avisos } = validateTrayecto(t, S);
    errores.forEach(m => add(errors, base, m));
    avisos.forEach(m => add(warnings, base, m));
  }
  for (const [faqId, ids] of Object.entries(porFaq)) {
    if (ids.length > 1) add(errors, `faqs.${faqId}`, `Tiene ${ids.length} trayectos publicados (${ids.join(', ')}); debe haber uno.`);
  }
  for (const faq of Object.values(S.FAQ || {})) {
    const publicado = !!porFaq[faq.id];
    if (faq.trayecto_curado && !publicado) add(errors, `faqs.${faq.id}`, 'Marcada como curada pero no tiene trayecto publicado.');
    if (publicado && !faq.trayecto_curado) add(warnings, `faqs.${faq.id}`, 'Tiene trayecto publicado pero no está marcada como trayecto_curado.');
  }
  return { errors, warnings };
}
