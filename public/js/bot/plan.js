import { entrySubOfFaq, resolvePasajeRef, etapaSubs, expandStep, normalizeStep } from './graph.js';

export const ENTRY_DEFAULT = '1094a1-3';
export const DEFAULT_MAX_STEPS = 6;

// Expande un path de step IDs (strings: atómicos o fusionados) a los IDs atómicos
// que lo cubren, en orden. Útil para tests y para saber qué sub-unidades cubre cada paso.
export function expandPlan(S, plan) {
  return plan.flatMap(stepId => expandStep(S, stepId));
}

// Recorrido introductorio por defecto (cuando no hay pregunta específica):
// selecciona los hitos representativos de cada etapa intro de def.eudaimonia (6 pasos).
export function defaultTour(S) {
  const def = S.DEF['def.eudaimonia'];
  if (def) {
    const ids = [];
    for (const etapa of (def.etapas || [])) {
      if (etapa.nivel !== 'intro') continue;
      if (etapa.a?.startsWith('sub:')) {
        const sid = etapa.a.slice(4);
        if (S.SUB[sid] && !ids.includes(sid)) ids.push(sid);
        for (const s of (etapa.subs || []).slice(0, 1)) {
          if (S.SUB[s] && !ids.includes(s)) ids.push(s);
        }
      } else {
        const subs = etapaSubs(S, etapa);
        if (subs.length) {
          const pick = (etapa.subs || []).find(s => S.SUB[s]) || subs[0];
          if (pick && !ids.includes(pick)) ids.push(pick);
        }
      }
    }
    if (ids.length) return [ENTRY_DEFAULT, ...ids.filter(x => x !== ENTRY_DEFAULT)];
  }
  return [ENTRY_DEFAULT];
}

function dedupe(a) {
  const s = new Set();
  return a.filter(x => x && !s.has(x) && s.add(x));
}

function sortByTextOrder(G, subIds) {
  return subIds.slice().sort((a, b) => {
    const oa = G.nodes.get(a)?.order ?? 9999;
    const ob = G.nodes.get(b)?.order ?? 9999;
    return oa - ob;
  });
}

// Busca un único nodo puente de alto valor argumentativo (destino, etapa, funcional, hacia_faq)
// entre `from` y `to` cuando no son contiguos, evitando rellenar con decenas de pasos `seq`.
function findArgumentBridge(S, G, from, to, forbidden = new Set()) {
  if (!from || !to || from === to) return [];
  const oFrom = G.nodes.get(from)?.order ?? 0;
  const oTo   = G.nodes.get(to)?.order ?? 0;

  // Si están muy cerca en el texto (<= 2 sub-unidades), no hace falta puente o basta el intermedio
  if (Math.abs(oTo - oFrom) <= 1) return [];

  const edgesFrom = G.adj.get(from) || [];
  // 1. ¿Hay arista semántica directa (destino, etapa, funcional, hacia_faq, mapa)?
  const direct = edgesFrom.find(e => e.to === to && e.rel !== 'seq');
  if (direct) return [];

  // 2. Buscar un puente de 1 salto: from -> mid -> to priorizando aristas causales/funcionales
  // que respeten el avance del argumento (oFrom < oMid < oTo).
  const relScore = { destino: 5, etapa: 4.5, hacia_faq: 4, funcional: 3.5, mapa: 3, pivote: 2, seq: 0.5 };
  let bestMid = null;
  let bestScore = -1;

  for (const e1 of edgesFrom) {
    const mid = e1.to;
    if (forbidden.has(mid) || mid === from || mid === to) continue;
    const oMid = G.nodes.get(mid)?.order ?? 0;
    const inOrder = (oFrom < oMid && oMid < oTo);

    const edgesMid = G.adj.get(mid) || [];
    const e2 = edgesMid.find(x => x.to === to);
    if (e2) {
      const sc = (relScore[e1.rel] || 1) + (relScore[e2.rel] || 1) + (inOrder ? 2 : 0);
      if (sc > bestScore) {
        bestScore = sc;
        bestMid = mid;
      }
    } else if (inOrder && e1.rel !== 'seq' && e1.rel !== 'pivote') {
      // Salto semántico desde `from` que nos acerca sustancialmente a `to`
      const sc = (relScore[e1.rel] || 1) + 1;
      if (sc > bestScore) {
        bestScore = sc;
        bestMid = mid;
      }
    }
  }

  return bestMid ? [bestMid] : [];
}

// ── Fase B: pasos fusionados ───────────────────────────────────────────────────
// Un "step ID" es un string que puede ser:
//   - un id atómico de tags ("1098a3-5")  → existe en S.SUB
//   - un id Bekker fusionado ("1098a3-8") → NO existe en S.SUB; expandStep lo resuelve
//     a sus atómicos cubiertos. Es la identidad narrativa del paso fusionado.
// El plan devuelve step IDs (strings). normalizeStep(S, stepId) da {id, ids, label}.

// Construye la columna vertebral a partir de un argumento canónico (temático o definicional).
// argDef viene de S.argumentos.argumentos[faq.argumento].
// Devuelve una lista de step IDs (strings), preservando los IDs fusionados de la secuencia.
// Construye la columna vertebral a partir de un argumento canónico (temático o definicional).
function buildArgumentSpine(S, G, argDef, maxSteps, extraHitObligatorios = []) {
    let secuencia = [];
    if (argDef.tipo === 'tematico') {
        secuencia = (argDef.secuencia || []).filter(s => expandStep(S, s).length > 0);
    } else if (argDef.tipo === 'definicion_por_etapas') {
        const defs = S.DEFC?.[argDef.concepto];
        const def = defs?.[0];
        if (def) {
            for (const etapa of (def.etapas || [])) {
                if (etapa.nivel !== argDef.etapas_nivel) continue;
                const hitos = [];
                if (etapa.a?.startsWith('sub:')) {
                    const sid = etapa.a.slice(4);
                    if (S.SUB[sid]) hitos.push(sid);
                }
                for (const s of etapa.subs || []) {
                    if (S.SUB[s] && !hitos.includes(s)) hitos.push(s);
                }
                if (!hitos.length) {
                    for (const sid of etapaSubs(S, etapa)) {
                        if (!hitos.includes(sid)) hitos.push(sid);
                    }
                }
                for (const sid of hitos) {
                    if (!secuencia.includes(sid)) secuencia.push(sid);
                }
            }
        }
    }
    if (!secuencia.length) return [ENTRY_DEFAULT];

    const hitObligatorios = new Set([
        ...(argDef.hit_obligatorios || []),
        ...extraHitObligatorios
    ]);

    const coveredIds = new Set(secuencia.flatMap(s => expandStep(S, s)));
    for (const hit of hitObligatorios) {
        if (coveredIds.has(hit) || !S.SUB[hit]) continue;
        // CAMBIO CLAVE: En trayectos canónicos NO reordenamos por orden textual (Bekker).
        // Si falta un hito obligatorio, lo agregamos al final para no romper la narrativa manual.
        secuencia.push(hit);
        coveredIds.add(hit);
    }

    // Devolvemos la secuencia intacta. planPath se encargará del resto.
    return secuencia;
}

// Construye la columna vertebral para una FAQ basada en sus pasajes (lógica legacy).
// Devuelve una lista de step IDs atómicos (sin fusionar).
function buildFaqSpineLegacy(S, G, faq) {
  const contexto = [];
  const responde = [];
  const matiza = [];

  for (const p of faq.pasajes || []) {
    const sid = resolvePasajeRef(S, p.ref);
    if (!sid) continue;
    if (p.rol === 'contexto') contexto.push(sid);
    else if (p.rol === 'responde') responde.push(sid);
    else if (p.rol === 'matiza') matiza.push(sid);
  }

  // Si es la FAQ general de definición de la felicidad, usar los hitos de def.eudaimonia
  // (mantenido por compatibilidad, pero ahora se usa el argumento canónico)
  if (faq.id === 'faq.eudaimonia.definicion' && S.DEF['def.eudaimonia']) {
    return [
      '1094a1-3',
      '1095a17-20',
      '1097b20-21',
      '1098a7-8',
      '1098a16-18',
      '1098a18-20',
    ].filter(id => S.SUB[id]);
  }

  const sortedCtx  = sortByTextOrder(G, dedupe(contexto));
  const sortedResp = sortByTextOrder(G, dedupe(responde));
  const sortedMat  = sortByTextOrder(G, dedupe(matiza));

  const spine = [];

  // 1. Punto de partida contextual
  const firstResp = sortedResp[0];
  const firstRespOrder = G.nodes.get(firstResp)?.order ?? 0;

  const earlyCtx = sortedCtx.filter(c => (G.nodes.get(c)?.order ?? 0) < firstRespOrder);
  if (earlyCtx.length) {
    spine.push(earlyCtx[0]);
  } else if (firstResp && firstResp !== ENTRY_DEFAULT) {
    let anticipator = null;
    for (const [sid, sub] of Object.entries(S.SUB)) {
      if ((G.nodes.get(sid)?.order ?? 999) >= firstRespOrder) continue;
      const hitsFaq = (sub.relaciones || []).some(r =>
        (r.destinos || []).some(d => d.hacia?.faq === faq.id)
      );
      if (hitsFaq) { anticipator = sid; break; }
    }
    if (anticipator) {
      spine.push(anticipator);
    } else if (faq.arbol?.cat === 'I' && firstRespOrder > 5) {
      spine.push(ENTRY_DEFAULT);
    }
  }

  // 2. Pasajes centrales que responden la pregunta (en orden del texto)
  for (const r of sortedResp) {
    if (!spine.includes(r)) spine.push(r);
  }

  // 3. Si el trayecto quedó muy corto (< 4 pasos) y hay un matiz posterior, incluir el primer matiz
  const lastRespOrder = G.nodes.get(spine[spine.length - 1])?.order ?? 0;
  const afterMat = sortedMat.filter(m => (G.nodes.get(m)?.order ?? 0) > lastRespOrder);
  if (spine.length < 5 && afterMat.length) {
    spine.push(afterMat[0]);
  } else if (spine.length < 4 && sortedCtx.length) {
    for (const c of sortedCtx) {
      if (!spine.includes(c)) { spine.push(c); break; }
    }
  }

  return spine.length ? spine : [firstResp || ENTRY_DEFAULT];
}

// Construye la columna vertebral para un concepto suelto.
// Devuelve una lista de step IDs atómicos.
function buildConceptSpine(S, G, goal) {
  const conceptId = goal.id;
  const out = [];

  // 1. Si el concepto tiene definición por etapas, tomar el hito de cada etapa intro
  const defs = S.DEFC?.[conceptId];
  if (defs?.length) {
    for (const etapa of (defs[0].etapas || [])) {
      if (etapa.nivel !== 'intro') continue;
      const subs = etapaSubs(S, etapa);
      if (subs[0] && !out.includes(subs[0])) out.push(subs[0]);
    }
  }

  // 2. Sub-unidades donde el concepto es concepto_clave principal o secundario
  if (out.length < 4) {
    const primaryMatches = [];
    const secondaryMatches = [];
    for (const [sid, sub] of Object.entries(S.SUB)) {
      const kc = sub.conceptos_clave || [];
      if (kc[0] === conceptId) primaryMatches.push(sid);
      else if (kc.includes(conceptId)) secondaryMatches.push(sid);
    }
    for (const sid of sortByTextOrder(G, primaryMatches)) {
      if (!out.includes(sid)) out.push(sid);
    }
    if (out.length < 3) {
      for (const sid of sortByTextOrder(G, secondaryMatches)) {
        if (!out.includes(sid)) out.push(sid);
        if (out.length >= 5) break;
      }
    }
  }

  if (goal.targetSub && S.SUB[goal.targetSub] && !out.includes(goal.targetSub)) {
    out.push(goal.targetSub);
  }

  const ordered = sortByTextOrder(G, dedupe(out));
  if (!ordered.length) return [ENTRY_DEFAULT];
  if (ordered[0] !== ENTRY_DEFAULT && ordered.length < 4) {
    ordered.unshift(ENTRY_DEFAULT);
  }
  return ordered;
}

// TrimPath recibe una lista de step IDs y un Set de hitos (IDs atómicos).
// Un step "es anchor" si su expansión (expandStep) contiene algún hito obligatorio.
// Preserva: (1) el primer paso, (2) el último paso, (3) cualquier paso anchor/hito.
// Luego muestrea el medio preservando los anchors (bot-B5 fix).
function stepIsAnchor(S, stepId, anchors) {
  if (!anchors || anchors.size === 0) return false;
  return expandStep(S, stepId).some(id => anchors.has(id));
}

function trimPath(S, G, path, maxSteps, anchors, isStrictManual = false) {
    // CAMBIO CLAVE: Si es manual, devolver exactamente lo que se armó, solo deduplicando.
    // Sin recortes por límite, sin muestreos uniformes, sin reordenamiento cronológico.
    if (isStrictManual) {
        const seen = new Set();
        return path.filter(s => {
            if (seen.has(s)) return false;
            seen.add(s);
            return true;
        });
    }

  
  if (path.length <= maxSteps) return path.slice();
  path = path.slice();
  const first = path[0];
  const last = path[path.length - 1];

  // 1. Primero quitar nodos que NO son anchors (puentes intermedios) ni hitos
  while (path.length > maxSteps) {
    let removableIdx = -1;
    for (let i = 1; i < path.length - 1; i++) {
      if (!stepIsAnchor(S, path[i], anchors)) {
        removableIdx = i;
        break;
      }
    }
    if (removableIdx === -1) break;
    path.splice(removableIdx, 1);
  }

  // 2. Si aún supera maxSteps, conservar el inicio, el final y muestrear
  // uniformemente el medio — pero preservando los pasos anchor/hitos
  // (bot-B5 fix: antes se descartaban hitos obligatorios en el muestreo).
  if (path.length > maxSteps && maxSteps >= 2) {
    const sampled = [first];
    const innerCount = maxSteps - 2;
    const inner = path.slice(1, -1);

    // Recoger los anchors en inner que deben sobrevivir
    const innerAnchors = inner.filter(s => stepIsAnchor(S, s, anchors));
    const nonAnchors = inner.filter(s => !stepIsAnchor(S, s, anchors));

    if (innerAnchors.length >= innerCount) {
      // Ya hay más anchors que huecos: priorizar los primeros anchors
      // (orden textual preservado)
      for (const a of innerAnchors.slice(0, innerCount)) sampled.push(a);
    } else {
      // Añadir todos los anchors primero, luego muestrear el resto
      for (const a of innerAnchors) sampled.push(a);
      const remainingCount = innerCount - innerAnchors.length;
      for (let k = 0; k < remainingCount && nonAnchors.length; k++) {
        const idx = Math.floor(((k + 0.5) * nonAnchors.length) / remainingCount);
        sampled.push(nonAnchors[Math.min(idx, nonAnchors.length - 1)]);
      }
    }

    sampled.push(last);
    // Re-ordenar el medio por orden textual de los IDs para mantener coherencia
    // (first y last se mantienen fijos en primera/última posición)
    const mid = sampled.slice(1, -1);
    mid.sort((a, b) => {
      const oa = G.nodes.get(expandStep(S, a)[0])?.order ?? 9999;
      const ob = G.nodes.get(expandStep(S, b)[0])?.order ?? 9999;
      return oa - ob;
    });
    const result = [first, ...mid, last];
    // Dedupe
    const seen = new Set();
    return result.filter(s => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
  }

  return path;
}

// planPath devuelve un array de step IDs (strings). Cada step ID puede ser:
//   - un id atómico de S.SUB ("1098a3-5") → un paso = una sub-unidad
//   - un id Bekker fusionado ("1098a3-8") → un paso = varias sub-unidades fusionadas
// Los IDs fusionados son la identidad narrativa del paso; expandStep(S, id)
// da los IDs atómicos que lo cubren. manual.por_subunidad[fusedId] tiene la
// exposición unificada del paso fusionado.
export function planPath(S, G, goal, opts = {}) {
    const maxSteps = opts.maxSteps === Infinity
        ? Infinity
        : (Number.isFinite(opts.maxSteps) ? opts.maxSteps : DEFAULT_MAX_STEPS);

    if (!goal || !goal.type) {
        return defaultTour(S).slice(0, maxSteps);
    }

    let spine = [];
    let isStrictManual = false; // <--- NUEVO

    if (goal.type === 'faq' && S.FAQ[goal.id]) {
        const faq = S.FAQ[goal.id];
        if (faq.argumento && S.argumentos?.argumentos?.[faq.argumento]) {
            const argDef = S.argumentos.argumentos[faq.argumento];
            const extraHitObligatorios = faq.hit_obligatorios_extra || [];
            spine = buildArgumentSpine(S, G, argDef, maxSteps, extraHitObligatorios);
            isStrictManual = true; // <--- NUEVO: Los argumentos canónicos son sagrados
        } else {
            spine = buildFaqSpineLegacy(S, G, faq);
        }
    } else {
        spine = buildConceptSpine(S, G, goal);
    }

    const anchors = new Set(spine.flatMap(s => expandStep(S, s)));
    const path = [];
    const used = new Set();

    for (let i = 0; i < spine.length; i++) {
        const curr = spine[i];
        const currAtomics = expandStep(S, curr);
        const alreadyUsed = currAtomics.every(id => used.has(id));
        if (!alreadyUsed) {
            path.push(curr);
            for (const id of currAtomics) used.add(id);
        }

        // CAMBIO CLAVE: Solo inyectar puentes si NO es una secuencia manual/canónica
        if (!isStrictManual && i < spine.length - 1) {
            const next = spine[i + 1];
            const nextFirst = expandStep(S, next)[0];
            const currLast = currAtomics.at(-1);
            if (path.length + (spine.length - 1 - i) < maxSteps) {
                const bridge = findArgumentBridge(S, G, currLast, nextFirst, used);
                for (const b of bridge) {
                    if (!used.has(b) && !anchors.has(b)) {
                        path.push(b);
                        used.add(b);
                    }
                }
            }
        }
    }

    return trimPath(S, G, path, maxSteps, anchors, isStrictManual);
}