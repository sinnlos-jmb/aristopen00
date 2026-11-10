import {
  buildFunctionalGraph, findFunctionalPaths, findPathsThroughRequired, scorePath,
} from './functionalGraph.js';
import { esc } from '../ui.js';

const ARE = new Set(['arete','arete_ethike','arete_dianoetike','excelencia']);
const labelOf = (S, id) => S.FN?.[id]?.label || S.N?.[id]?.label || id;
const grOf    = (S, id) => S.FN?.[id]?.gr    || S.N?.[id]?.gr    || '';

function hasFunctionalData(S) {
  return !!(S.FN && S.FE && Object.keys(S.FN).length && S.FE.length);
}

// ────────────────────────────────────────────────────────────
// Trayectos manuales activos por FAQ
// ────────────────────────────────────────────────────────────

export function getCustomTrajectories(S, faqId) {
  // 1. Primero busca en sessionStorage (editor de trayectos del Lab)
  try {
    const raw = sessionStorage.getItem('agora.lab.trayectos');
    if (raw) {
      const all = JSON.parse(raw);
      if (Array.isArray(all?.[faqId]) && all[faqId].length) {
        return all[faqId];
      }
    }
  } catch (_) {
    // ignorar JSON inválido
  }

  // 2. Fallback: trayectos definidos directamente en el store
  if (Array.isArray(S?.FAQ_TRAYECTOS?.[faqId])) {
    return S.FAQ_TRAYECTOS[faqId];
  }

  return [];
}

// El trayecto que reproduce el chat se obtiene con S.repo.trayectoVigente()
// (content/repository.js); acá solo quedan los candidatos para el Lab.

// ────────────────────────────────────────────────────────────
// Construir candidatos manuales para el Lab (SVG y Scoring)
// ────────────────────────────────────────────────────────────
function buildCustomCandidates(S, faq, adj, spotlights, primaryId) {
  const custom = getCustomTrajectories(S, faq.id);
  if (!custom.length) return [];

  return custom.map(traj => {
    // Para el grafo funcional del Lab, necesitamos la secuencia de NODOS FUNCIONALES (FN)
    // Asumimos que `traj.nodos` guarda los IDs del grafo funcional (phusis, arete, theion, etc.)
    const path = traj.nodos || [];
    if (path.length < 2 || path[0] !== 'phusis' || path[path.length - 1] !== 'theion') return null;

    const edges = [];
    let valid = true;
    for (let i = 0; i < path.length - 1; i++) {
      const de = path[i], a = path[i + 1];
      let edge = S.FE?.find(e => e.de === de && e.a === a);
      let dir = 1;
      if (!edge) {
        edge = S.FE?.find(e => e.de === a && e.a === de);
        dir = -1;
      }
      if (!edge) { valid = false; break; }
      edges.push({ edge, dir });
    }
    
    if (!valid) return null;

    const sc = scorePath(path, edges);
    const cov = coverageOf(S, path, spotlights);
    const um = computeUnitMetrics(S, path);
    
    const coverageBonus = cov.coverageFN * 0.8 + cov.coverageStatic * 1.0;
    const unitsBonus = um.unitCoherence * 0.4 + um.momentOrder * 0.5 + um.densityScore * 0.3;
    const primaryBonus = primaryId && path.includes(primaryId) ? 1.5 : 0;
    
    // Bono manual: si está marcado como activo, aplasta a los autogenerados
    const manualBonus = traj.activo ? 10.0 : 2.0; 

    return {
      path,
      edges,
      n: path.length,
      ...sc,
      ...um,
      scoreBreakdown: { structural: sc.score, coverage: coverageBonus, units: unitsBonus, primary: primaryBonus },
      viaMap: cov.viaMap,
      uncovered: cov.uncovered,
      requiredFN: cov.requiredFN,
      primaryCovered: !primaryId || path.includes(primaryId),
      coverage: cov.coverage,
      coverageFN: cov.coverageFN,
      coverageStatic: cov.coverageStatic,
      total: sc.score + coverageBonus + unitsBonus + primaryBonus + manualBonus,
      chatPreview: buildChatPreview(S, adj, { path, edges }),
      isCustom: true,
      manualMeta: {
        titulo: traj.titulo,
        dificultad: traj.dificultad,
        fecha: traj.fecha,
        activo: traj.activo,
      },
    };
  }).filter(Boolean);
}

// ────────────────────────────────────────────────────────────
// Ancla funcional de un concepto estático
// ────────────────────────────────────────────────────────────
function findFunctionalAnchor(S, conceptId) {
  if (!conceptId) return null;
  if (S.FN && S.FN[conceptId]) return conceptId;
  if (S.REM && S.REM[conceptId]?.length) return S.REM[conceptId][0];
  if (S.N && S.N[conceptId]) {
    const path = S.N[conceptId].path || [];
    if (path.length) {
      const parent = path[path.length - 1];
      if (S.FN && S.FN[parent]) return parent;
      if (S.REM && S.REM[parent]?.length) return S.REM[parent][0];
    }
    for (let i = path.length - 2; i >= 0; i--) {
      const anc = path[i];
      if (S.FN && S.FN[anc]) return anc;
      if (S.REM && S.REM[anc]?.length) return S.REM[anc][0];
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────
// Spotlights: focos de la FAQ, con PRIMARY
// ────────────────────────────────────────────────────────────
function getSpotlightConcepts(S, faq) {
  const out = new Map();

  const push = (id, source, isPrimary = false) => {
    if (!id) return;
    const clean = String(id).split('#')[0];
    const n = S.N?.[clean], f = S.FN?.[clean];
    if (!n && !f) return;
    if (out.has(clean)) {
      const entry = out.get(clean);
      entry.sources.push(source);
      if (isPrimary) entry.isPrimary = true;
      return;
    }
    const isFunctional = !!(S.FN && S.FN[clean]);
    const anchor = isFunctional ? clean : findFunctionalAnchor(S, clean);
    out.set(clean, {
      id: clean,
      label: n?.label || f?.label || clean,
      gr: n?.gr || f?.gr || '',
      sources: [source],
      isFunctional,
      anchor,
      isPrimary,
    });
  };

  if (faq.arbol?.nodo) push(faq.arbol.nodo, 'arbol', true);

  for (const firma of faq.firmas || []) {
    for (const arg of firma.arguments || []) {
      const [type, raw] = String(arg).split(/:(.*)/s);
      if (type === 'static' || type === 'func') push(raw, 'firma');
      else if (type === 'sense') push(raw.split('#')[0], 'firma');
    }
  }

  for (const p of faq.pasajes || []) {
    if (p.rol !== 'responde') continue;
    const sub = S.SUB?.[p.ref];
    if (sub) for (const c of sub.conceptos_clave || []) push(c, 'sub-unidad');
  }

  const list = [...out.values()];
  if (!list.some(s => s.isPrimary)) {
    const firstFN = list.find(s => s.isFunctional);
    if (firstFN) firstFN.isPrimary = true;
  }

  return list;
}

// ────────────────────────────────────────────────────────────
// Dedup de paths
// ────────────────────────────────────────────────────────────
function dedupPaths(paths) {
  const seen = new Set();
  return paths.filter(p => {
    const key = p.path.join('→');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ────────────────────────────────────────────────────────────
// Filtro por primary (estricto) + emergency fallback
// ────────────────────────────────────────────────────────────
function filterByPrimary(candidates, primaryId) {
  if (!primaryId) return candidates;
  return candidates.filter(c => c.path.includes(primaryId));
}

// ────────────────────────────────────────────────────────────
// Cobertura
// ────────────────────────────────────────────────────────────
function coverageOf(S, path, spotlights) {
  const pathSet = new Set(path);
  const viaMap = new Map();
  const uncovered = [];
  const coveredFN = [];
  const coveredStatic = [];
  const requiredFN = spotlights.filter(s => s.isFunctional).map(s => s.id);
  const staticFoci = spotlights.filter(s => !s.isFunctional);

  for (const sp of spotlights) {
    if (sp.isFunctional) {
      if (pathSet.has(sp.id)) coveredFN.push(sp);
      else uncovered.push(sp);
      continue;
    }
    if (sp.anchor && pathSet.has(sp.anchor)) {
      coveredStatic.push(sp);
      if (!viaMap.has(sp.anchor)) viaMap.set(sp.anchor, []);
      viaMap.get(sp.anchor).push(sp);
    } else {
      uncovered.push(sp);
    }
  }

  const total = spotlights.length;
  const coverage = total ? (coveredFN.length + coveredStatic.length) / total : 1;
  return {
    coverage, viaMap, uncovered, coveredFN, coveredStatic, staticFoci, requiredFN,
    coverageFN: requiredFN.length ? coveredFN.length / requiredFN.length : 1,
    coverageStatic: staticFoci.length ? coveredStatic.length / staticFoci.length : 1,
  };
}

// ────────────────────────────────────────────────────────────
// Métricas de unidades / momentos
// ────────────────────────────────────────────────────────────
function computeUnitMetrics(S, path) {
  const nodeUnits   = path.map(id => S.NODE_UNIT?.[id]?.unidad || null);
  const nodeMoments = path.map(id => {
    const sub = S.NODE_UNIT?.[id]?.sub;
    return sub && S.MOM[sub]?.m?.id ? S.MOM[sub].m.id : null;
  });

  const unitSeq = nodeUnits.filter(Boolean);
  const unitSwitches = unitSeq.filter((u, i) => i > 0 && u !== unitSeq[i - 1]).length;
  const unitCoherence = unitSeq.length ? Math.max(0, 1 - unitSwitches * 0.15) : 0;

  const inversions = [];
  let prevUnit = null, prevMoment = null;
  for (let i = 0; i < path.length; i++) {
    const u = nodeUnits[i], m = nodeMoments[i];
    if (!u) continue;
    if (u === prevUnit && m && prevMoment && m !== prevMoment) {
      const ids = (S.U[u]?.articulacion?.momentos || []).map(x => x.id);
      const pi = ids.indexOf(prevMoment), ci = ids.indexOf(m);
      if (pi >= 0 && ci >= 0 && ci < pi) inversions.push([prevMoment, m]);
    }
    prevUnit = u; prevMoment = m || prevMoment;
  }
  const momentOrder = Math.max(0, 1 - inversions.length * 0.1);

  const counts = {};
  nodeUnits.filter(Boolean).forEach(u => counts[u] = (counts[u] || 0) + 1);
  const vals = Object.values(counts);
  const avgPerUnit = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const densityScore = Math.min(1, avgPerUnit / 2);

  return {
    nodeUnits, nodeMoments, unitSwitches,
    uniqueUnits: Object.keys(counts).length,
    unitCoherence, momentOrder, inversions: inversions.length,
    densityScore, avgPerUnit,
  };
}

// ────────────────────────────────────────────────────────────
// Chat preview: pasos del chat + laterales por paso
// ────────────────────────────────────────────────────────────
function buildChatPreview(S, adj, traj) {
  const pathSet = new Set(traj.path);
  const steps = [];
  let prevUnit = null;

  for (const nodeId of traj.path) {
    if (nodeId === 'phusis' || nodeId === 'theion') continue;
    const nu = S.NODE_UNIT?.[nodeId];
    const sub = nu ? S.SUB[nu.sub] : null;
    if (!sub) continue;

    const laterals = (adj.get(nodeId) || [])
      .filter(e => !pathSet.has(e.to))
      .map(e => ({
        id: e.to,
        label: S.FN[e.to]?.label || e.to,
        rel: e.edge.rel,
      }))
      .slice(0, 4);

    const unitChanged = nu?.unidad && nu.unidad !== prevUnit;
    const unit = nu?.unidad ? S.U[nu.unidad] : null;

    steps.push({
      nodeId,
      label: S.FN[nodeId]?.label || nodeId,
      sub: {
        id: sub.id,
        titulo: sub.titulo,
        bekker: sub.bekker,
        intro: sub.intro,
        unidad: sub.unidad,
      },
      unitChanged,
      unit: unit ? { id: unit.id, titulo: unit.titulo, resumen: unit.resumen || '' } : null,
      laterals,
      progress: steps.length + 1,
    });

    if (nu?.unidad) prevUnit = nu.unidad;
  }

  return steps;
}

// ────────────────────────────────────────────────────────────
// Orquestador
// ────────────────────────────────────────────────────────────
export function buildAllTrajectories(S) {
  const faqs = S.repo.faqs().filter(f => f && f.pregunta);
  if (!hasFunctionalData(S)) {
    return { faqs, trajectories: [], error: 'Faltan funcional_v1.json o estatico_v1.json en /data/' };
  }

  const adj = buildFunctionalGraph(S);
  const basePaths = findFunctionalPaths(adj, 'phusis', 'theion', {
    K: 15, maxDepth: 9, beamWidth: 60,
  });

  const trajectories = faqs.map(faq => {
    const spotlights = getSpotlightConcepts(S, faq);
    const primaryFocus = spotlights.find(s => s.isPrimary) || null;
    const primaryId = primaryFocus?.isFunctional ? primaryFocus.id : primaryFocus?.anchor;

    // 1. Trayectos MANUALES (Prioridad alta)
    const customCandidates = buildCustomCandidates(S, faq, adj, spotlights, primaryId);

    // 2. Base paths auto-generados
    let allPaths = basePaths.slice();

    // 3. Forzar primary si no está cubierto
    if (primaryId && !allPaths.some(p => p.path.includes(primaryId))) {
      const forced = findPathsThroughRequired(adj, 'phusis', 'theion', [primaryId], { K: 10 });
      allPaths = allPaths.concat(forced);
    }

    // 4. Dedup y filtro estricto por primary
    allPaths = dedupPaths(allPaths);
    const filtered = filterByPrimary(allPaths, primaryId);

    // 5. Scoring auto-generados
    const autoRanked = filtered.map(p => {
      const sc  = scorePath(p.path, p.edges);
      const cov = coverageOf(S, p.path, spotlights);
      const um  = computeUnitMetrics(S, p.path);

      const coverageBonus = cov.coverageFN * 0.8 + cov.coverageStatic * 1.0;
      const unitsBonus    = um.unitCoherence * 0.4 + um.momentOrder * 0.5 + um.densityScore * 0.3;
      const primaryBonus  = primaryId && p.path.includes(primaryId) ? 1.5 : 0;

      return {
        ...p, ...sc, ...um,
        scoreBreakdown: { structural: sc.score, coverage: coverageBonus, units: unitsBonus, primary: primaryBonus },
        viaMap: cov.viaMap,
        uncovered: cov.uncovered,
        requiredFN: cov.requiredFN,
        primaryCovered: !primaryId || p.path.includes(primaryId),
        coverage: cov.coverage,
        coverageFN: cov.coverageFN,
        coverageStatic: cov.coverageStatic,
        total: sc.score + coverageBonus + unitsBonus + primaryBonus,
        chatPreview: buildChatPreview(S, adj, p),
        isCustom: false,
      };
    });

    // 6. Combinar: manuales primero (gracias al manualBonus), luego auto
    const allCandidates = [...customCandidates, ...autoRanked]
      .map(c => ({
        ...c,
        primaryFocus: primaryFocus ? { id: primaryFocus.id, label: primaryFocus.label, gr: primaryFocus.gr } : null,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { faq, spotlights, primaryFocus, candidates: allCandidates };
  });

  return { faqs, trajectories, error: null };
}

// ────────────────────────────────────────────────────────────
// SVG
// ────────────────────────────────────────────────────────────
export function renderTrajectorySVG(traj, S) {
  const nodes = traj.path;
  const n = nodes.length;
  const NODE_W = 132, MARGIN = 50, CY = 82, R = 24, R_END = 28;
  const W = MARGIN * 2 + (n - 1) * NODE_W;
  const viaMap = traj.viaMap || new Map();
  const requiredFN = new Set(traj.requiredFN || []);
  const primaryId = traj.primaryFocus?.id || null;
  const hasVias = [...viaMap.values()].some(v => v.length > 0);
  const H = hasVias ? 200 : 170;

  const edgeSvg = [];
  for (let i = 0; i < n - 1; i++) {
    const x1 = MARGIN + i * NODE_W + (i === 0 ? R_END : R);
    const x2 = MARGIN + (i + 1) * NODE_W - ((i === n - 2) ? R_END : R);
    const edge = traj.edges[i]?.edge;
    const kind = traj.rels[i] || 'med';
    const isMotor = ARE.has(nodes[i]) || ARE.has(nodes[i + 1]);
    const reversed = traj.edges[i]?.dir === -1;
    const cls = isMotor ? 'motor' : kind;
    edgeSvg.push(`
      <g class="traj-edge traj-edge--${cls}">
        <line x1="${x1}" y1="${CY}" x2="${x2}" y2="${CY}" />
        <polygon points="${reversed ? `${x1 + 7},${CY - 4} ${x1},${CY} ${x1 + 7},${CY + 4}` : `${x2 - 7},${CY - 4} ${x2},${CY} ${x2 - 7},${CY + 4}`}" />
        <text x="${(x1 + x2) / 2}" y="${CY - 10}" text-anchor="middle" font-size="9" font-style="italic">${esc(edge?.rel || '—')}${reversed ? ' (inversa)' : ''}</text>
      </g>`);
  }

  const nodeSvg = nodes.map((id, i) => {
    const isOrigin = i === 0, isEnd = i === n - 1, isMotor = ARE.has(id);
    const isFocus = requiredFN.has(id);
    const isPrimary = primaryId === id;
    const r = (isOrigin || isEnd) ? R_END : R;
    const cls = ['traj-node',
      isOrigin ? 'traj-node--origin' : isEnd ? 'traj-node--end' : 'traj-node--step',
      isMotor ? 'traj-node--motor' : '',
      isFocus ? 'traj-node--focus' : '',
      isPrimary ? 'traj-node--primary' : '',
    ].filter(Boolean).join(' ');

    const lbl = labelOf(S, id);
    const trunc = lbl.length > 17 ? lbl.slice(0, 16) + '…' : lbl;
    const gr = grOf(S, id);
    const tip = `${i + 1}. ${lbl}${gr ? ' (' + gr + ')' : ''}${isMotor ? ' · areté' : ''}${isFocus ? ' · foco' : ''}${isPrimary ? ' · FOCO PRINCIPAL' : ''}`;
    const x = MARGIN + i * NODE_W;

    let focusRing = '';
    if (isPrimary) {
      focusRing = `<circle cx="${x}" cy="${CY}" r="${r + 7}" fill="none" stroke="var(--gold)" stroke-width="2" stroke-dasharray="3 3" opacity="0.9" />`;
    } else if (isFocus) {
      focusRing = `<circle cx="${x}" cy="${CY}" r="${r + 5}" fill="none" stroke="var(--violet)" stroke-width="1.2" stroke-dasharray="2 3" opacity="0.7" />`;
    }

    const vias = viaMap.get(id) || [];
    let viaSvg = '';
    if (vias.length > 0) {
      const shown = vias.slice(0, 3).map(v => v.label).join(', ');
      const tail = vias.length > 3 ? ` +${vias.length - 3}` : '';
      const tip2 = vias.map(v => `${v.label}${v.gr ? ' (' + v.gr + ')' : ''}`).join(' · ');
      viaSvg = `
        <g class="traj-via">
          <title>${esc(tip2)}</title>
          <rect x="${x - 42}" y="${CY + r + 22}" width="84" height="16" rx="8" />
          <text x="${x}" y="${CY + r + 33}" text-anchor="middle" font-size="8.5" font-style="italic" class="traj-via-label">
            vía ${esc(shown + tail)}
          </text>
        </g>`;
    }

    return `
      <g class="${cls}" data-id="${esc(id)}">
        <title>${esc(tip)}</title>
        ${focusRing}
        <circle cx="${x}" cy="${CY}" r="${r}" />
        <text x="${x}" y="${CY + 4}" text-anchor="middle" font-size="11" font-weight="600" class="traj-num">${i + 1}</text>
        <text x="${x}" y="${CY + r + 14}" text-anchor="middle" font-size="10" class="traj-label">${esc(trunc)}</text>
        ${isOrigin ? `<text x="${x}" y="${CY - r - 8}" text-anchor="middle" font-size="9" font-style="italic" class="traj-tag">origen</text>` : ''}
        ${isEnd ? `<text x="${x}" y="${CY - r - 8}" text-anchor="middle" font-size="9" font-style="italic" class="traj-tag">fin</text>` : ''}
        ${isMotor ? `<text x="${x}" y="${CY - r - 8}" text-anchor="middle" font-size="9" font-style="italic" class="traj-tag">areté</text>` : ''}
        ${viaSvg}
      </g>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="traj-svg" xmlns="http://www.w3.org/2000/svg" role="img">
    ${edgeSvg.join('')}${nodeSvg}</svg>`;
}