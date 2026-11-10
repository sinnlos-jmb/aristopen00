import { parseBekker } from '../reader/text.js';

// Expande un paso de secuencia a las sub-unidades atómicas que lo cubren, en
// orden textual (Bekker ascendente). Un paso puede ser:
//   - un id atómico de tags ("1098a3-5")               → [id]
//   - un paso fusionado explícito {ids: [...]}          → sus atómicos (filtrados)
//   - un id Bekker fusionado ("1098a3-8")               → cobertura de atómicos
// Devuelve [] si el paso no cubre ninguna sub-unidad conocida.
export function expandStep(S, step) {
  if (!step) return [];
  if (typeof step === 'object') {
    const ids = step.ids || step.atomics || [];
    return ids.filter(id => S.SUB?.[id]);
  }
  const id = String(step);
  if (S.SUB?.[id]) return [id];
  const range = parseBekker(id)[0];
  if (!range) return [];
  const covered = [];
  for (const [subId, sub] of Object.entries(S.SUB)) {
    const own = parseBekker(sub.bekker?.[0] ?? subId)[0];
    const end = parseBekker(sub.bekker?.[1] ?? subId)[0];
    if (own && end && own.start >= range.start && end.end <= range.end) covered.push(subId);
  }
  return covered.sort((a, b) => parseBekker(a)[0].start - parseBekker(b)[0].start);
}

// Normaliza un paso crudo (string atómico, string Bekker fusionado, o {ids:[...]})
// a un step object {id, ids, label} donde `ids` son las sub-unidades atómicas
// que lo cubren en orden textual. Devuelve null si no resuelve.
export function normalizeStep(S, step) {
  if (!step) return null;
  if (typeof step === 'object') {
    const ids = expandStep(S, step);
    if (!ids.length) return null;
    return {
      id: step.id || ids[0],
      ids,
      label: step.label || S.SUB[ids[0]]?.titulo || ids[0],
    };
  }
  const id = String(step);
  const ids = expandStep(S, id);
  if (!ids.length) return null;
  return {
    id,
    ids,
    label: S.SUB[id]?.titulo || (ids.length === 1 ? S.SUB[ids[0]]?.titulo : id) || id,
  };
}

// Devuelve una sub-unidad (o sub-unidad sintética para pasos fusionados) para
// un step ID del plan. Para pasos atómicos devuelve S.SUB[id]; para fusionados,
// un objeto con la unión de intros/conceptos y el rango Bekker abarcante.
// Devuelve null si el paso no resuelve.
export function resolveSub(S, stepId) {
  const stepInfo = normalizeStep(S, stepId);
  if (!stepInfo || !stepInfo.ids.length) return null;
  const atomicIds = stepInfo.ids;
  if (atomicIds.length === 1 && stepId === atomicIds[0]) {
    return S.SUB[stepId] || null;
  }
  const first = S.SUB[atomicIds[0]];
  const last = S.SUB[atomicIds[atomicIds.length - 1]];
  return {
    id: stepId,
    ids: atomicIds,
    unidad: first?.unidad || null,
    bekker: [first?.bekker?.[0] || atomicIds[0], last?.bekker?.[1] || atomicIds[atomicIds.length - 1]],
    titulo: stepInfo.label || first?.titulo || stepId,
    intro: atomicIds.map(id => S.SUB[id]?.intro).filter(Boolean).join('\n\n'),
    conceptos_clave: [...new Set(atomicIds.flatMap(id => S.SUB[id]?.conceptos_clave || []))],
  };
}

// Resuelve una referencia de pasaje ("1098a3-5", "sub:1098a3-5", "u:ergon", "unidad:forma_fin")
// devolviendo un id de sub-unidad válido en S.SUB (o null).
export function resolvePasajeRef(S, ref) {
  if (!ref) return null;
  const str = String(ref).trim();
  if (S.SUB[str]) return str;
  if (str.startsWith('sub:')) {
    const id = str.slice(4);
    return S.SUB[id] ? id : null;
  }
  if (str.startsWith('u:') || str.startsWith('unidad:')) {
    const uid = str.startsWith('u:') ? str.slice(2) : str.slice(7);
    const unit = S.U?.[uid];
    const firstSub = unit?.subunidades?.[0]?.id;
    return firstSub && S.SUB[firstSub] ? firstSub : null;
  }
  return null;
}

// Extrae un rango Bekker de una cita textual como "EN I.7, 1098a16–18; X.6..."
// y devuelve la sub-unidad de S.SUB que coincide o lo contiene.
export function resolveRefStringToSub(S, refText) {
  if (!refText || !S?.SUB) return null;
  const str = String(refText).replace(/[–—]/g, '-');
  // 1. Coincidencia directa con algún id de S.SUB
  for (const subId of Object.keys(S.SUB)) {
    if (str.includes(subId)) return subId;
  }
  // 2. Coincidencia por inicio de Bekker (ej. "1097a15-24" → "1097a15-18")
  const m = str.match(/(\d{4}[ab]\d+)/);
  if (m) {
    const startBk = m[1];
    for (const [subId, sub] of Object.entries(S.SUB)) {
      if (sub.bekker?.[0] === startBk || subId.startsWith(startBk + '-')) {
        return subId;
      }
    }
  }
  return null;
}

export function etapaSubs(S, etapa) {
  if (!etapa) return [];
  const out = [];

  if (etapa.a?.startsWith('sub:')) {
    const id = etapa.a.slice(4);
    if (S.SUB[id]) out.push(id);
  } else if (etapa.a?.startsWith('unidad:') || etapa.a?.startsWith('u:')) {
    const uid = etapa.a.startsWith('u:') ? etapa.a.slice(2) : etapa.a.slice(7);
    const unit = S.U[uid];
    if (unit) {
      for (const sub of (unit.subunidades || [])) {
        if (S.SUB[sub.id] && !out.includes(sub.id)) out.push(sub.id);
      }
    }
  }

  for (const s of etapa.subs || []) {
    if (S.SUB[s] && !out.includes(s)) out.push(s);
  }

  return out;
}

export function buildGraph(S) {
  const nodes = new Map(), adj = new Map();
  let orderIdx = 0;

  for (const u of S.repo.unidades()) {
    for (const s of u.subunidades || []) {
      const id = s.id;
      const sub = S.SUB[id];
      if (!sub) continue;
      nodes.set(id, {
        id, sub, unidad: sub.unidad,
        order: orderIdx++,
        momento: S.MOM[id] ? S.MOM[id].m.id : null,
        keyConcepts: sub.conceptos_clave || [],
        title: sub.titulo,
      });
      adj.set(id, []);
    }
  }

  // Por si hubiera alguna sub-unidad suelta
  for (const id of Object.keys(S.SUB)) {
    if (nodes.has(id)) continue;
    const sub = S.SUB[id];
    nodes.set(id, {
      id, sub, unidad: sub.unidad,
      order: orderIdx++,
      momento: S.MOM[id] ? S.MOM[id].m.id : null,
      keyConcepts: sub.conceptos_clave || [],
      title: sub.titulo,
    });
    adj.set(id, []);
  }

  const add = (from, to, rel, weight, meta = null) => {
    if (from === to || !adj.has(from) || !adj.has(to)) return;
    const list = adj.get(from);
    const existing = list.find(e => e.to === to);
    if (existing) {
      if (weight > existing.weight) {
        existing.rel = rel;
        existing.weight = weight;
        if (meta) existing.meta = meta;
      }
      return;
    }
    list.push({ to, rel, weight, meta });
  };

  // 1. Secuencia lineal dentro de cada unidad y entre unidades consecutivas
  const allOrderedIds = [...nodes.keys()];
  for (let i = 0; i < allOrderedIds.length - 1; i++) {
    add(allOrderedIds[i], allOrderedIds[i + 1], 'seq', 1);
  }

  // 2. Etapas de las definiciones
  for (const d of Object.values(S.DEF)) {
    const es = (d.etapas || []).filter(e => e.nivel === 'intro');
    for (let i = 0; i < es.length - 1; i++) {
      const subsA = etapaSubs(S, es[i]);
      const subsB = etapaSubs(S, es[i + 1]);
      for (let k = 0; k < subsA.length - 1; k++) {
        add(subsA[k], subsA[k + 1], 'etapa', 3);
      }
      const lastA = subsA[subsA.length - 1];
      const firstB = subsB[0];
      if (lastA && firstB) add(lastA, firstB, 'etapa', 3);
    }
  }

  // 3. Relaciones argumentativas (anticipa / precisa / confirma / corrige) y destinos hacia FAQ
  for (const [id, sub] of Object.entries(S.SUB)) {
    for (const r of sub.relaciones || []) {
      for (const d of r.destinos || []) {
        // 3a. Destino directo a otra sub-unidad por ref Bekker
        const targetByRef = resolveRefStringToSub(S, d.ref);
        if (targetByRef && targetByRef !== id) {
          add(id, targetByRef, 'destino', 3.5, {
            tipo: d.tipo || 'precisa',
            arista: d.arista || null,
            t: d.t || '',
            faq: d.hacia?.faq || null,
          });
        }
        // 3b. Destino hacia la entrada de una FAQ
        if (d.hacia?.faq) {
          const entry = entrySubOfFaq(S, d.hacia.faq);
          if (entry) {
            add(id, entry, 'hacia_faq', 2.8, {
              tipo: d.tipo || 'anticipa',
              arista: d.arista || null,
              t: d.t || '',
              faq: d.hacia.faq,
            });
          }
        }
      }
    }

    // 3c. Vínculos de mapa entre sub-unidades
    for (const m of sub.mapa || []) {
      const targetSub = resolvePasajeRef(S, m.a);
      if (targetSub && targetSub !== id) {
        add(id, targetSub, 'mapa', 2.5, { t: m.t || '' });
      }
    }
  }

  // 4. Aristas del grafo funcional (S.FE) proyectadas sobre las sub-unidades ancla (S.NODE_UNIT)
  if (S.FE && S.NODE_UNIT) {
    for (const fe of S.FE) {
      const subDe = S.NODE_UNIT[fe.de]?.sub;
      const subA  = S.NODE_UNIT[fe.a]?.sub;
      if (subDe && subA && subDe !== subA) {
        add(subDe, subA, 'funcional', 2.2, {
          arista: fe.id || `${fe.de}--${fe.a}`,
          rel: fe.rel,
          nota: fe.nota || '',
        });
      }
    }
  }

  // 5. Pivotes conceptuales (para desvíos laterales y puentes secundarios)
  const byConcept = new Map();
  for (const [id, n] of nodes) for (const c of n.keyConcepts) {
    if (!byConcept.has(c)) byConcept.set(c, []);
    byConcept.get(c).push(id);
  }
  for (const [conceptId, ids] of byConcept.entries()) {
    if (ids.length < 2 || ids.length > 6) continue;
    const w = 1.5 / Math.log2(ids.length + 1);
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        add(ids[i], ids[j], 'pivote', w, { conceptId });
        add(ids[j], ids[i], 'pivote', w, { conceptId });
      }
  }
  return { nodes, adj };
}

// Busca el primer pasaje con rol 'responde' que resuelva a una sub-unidad válida en S.SUB
export function entrySubOfFaq(S, faqId) {
  const faq = S.FAQ[faqId];
  if (!faq) return null;
  const pasajes = faq.pasajes || [];

  // 1. Preferir referencias directas a sub-unidades con rol 'responde'
  for (const p of pasajes) {
    if (p.rol !== 'responde') continue;
    if (S.SUB[p.ref]) return p.ref;
    if (String(p.ref).startsWith('sub:')) {
      const sid = p.ref.slice(4);
      if (S.SUB[sid]) return sid;
    }
  }

  // 2. Si el único 'responde' es una unidad (ej. "u:ergon"), tomar su primera sub-unidad
  for (const p of pasajes) {
    if (p.rol !== 'responde') continue;
    const resolved = resolvePasajeRef(S, p.ref);
    if (resolved) return resolved;
  }

  return null;
}
