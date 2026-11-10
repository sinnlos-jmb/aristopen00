import { analyze, normalize } from '../lab/analyze.js';
import { entrySubOfFaq, resolvePasajeRef } from './graph.js';

// Re-export de la implementacion unica (fuente: lab/analyze.js).
export { normalize };

// Nota: NO incluir sustantivos filosóficos clave como 'bien', 'mal', 'ser', 'fin'
const STOPWORDS = new Set([
  'que', 'como', 'cuando', 'donde', 'porque', 'para', 'sobre', 'entre', 'desde', 'hasta',
  'este', 'esta', 'estos', 'estas', 'esto', 'todo', 'toda', 'todos', 'todas',
  'cosa', 'algo', 'nada', 'otro', 'otra', 'otros', 'otras', 'mismo', 'misma',
  'estar', 'tener', 'hacer', 'dice', 'dijo', 'segun', 'hace', 'puede', 'pueden',
  'ellos', 'ella', 'ellas', 'sino', 'quien', 'quienes', 'cual', 'cuales',
  'cuyo', 'cuya', 'solo', 'sola', 'mas', 'menos', 'hay', 'son', 'del', 'las', 'los', 'una', 'uno', 'unos', 'unas', 'por', 'con', 'sin',
]);

// Palabras de 3 letras que son conceptos clave en Aristóteles y no deben descartarse
const KEEP_SHORT = new Set(['fin', 'ser', 'mal', 'ley', 'uno', 'uso', 'ver']);

function tokenize(norm, minLen = 4, dropStop = true) {
  return norm.split(/\s+/).filter(w => {
    if (!w) return false;
    if (dropStop && STOPWORDS.has(w)) return false;
    if (KEEP_SHORT.has(w)) return true;
    return w.length >= minLen;
  });
}

function scoreMatch(t, sources) {
  const qTokens = tokenize(t);
  const words = new Set(qTokens);
  if (!words.size) return 0;
  let best = 0;
  for (const src of sources) {
    const normSrc = normalize(src);
    if (!normSrc) continue;
    if (normSrc === t) return words.size + 3; // match exacto de variante
    const sw = new Set(tokenize(normSrc));
    if (!sw.size) continue;
    let hits = 0;
    for (const w of sw) if (words.has(w)) hits++;
    if (hits > 0) {
      // Bonificar por proporción de cobertura sobre la fuente y la consulta
      const precision = hits / Math.max(words.size, sw.size);
      const score = hits + precision * 0.9;
      if (score > best) best = score;
    }
  }
  return best;
}

// ── Resolución de sub-unidad canónica para un concepto ──
// Cascada: definición (etapa intro) → FAQ que responde → NODE_UNIT → overlap conceptos_clave.
export function resolveTargetSub(S, conceptId) {
  if (!conceptId) return null;

  // 1. Definición: primera sub-unidad válida de una etapa intro
  const defs = S.DEFC?.[conceptId];
  if (defs?.length) {
    for (const d of defs) {
      for (const etapa of d.etapas || []) {
        if (etapa.nivel !== 'intro') continue;
        const resolved = resolvePasajeRef(S, etapa.a);
        if (resolved) return resolved;
        for (const s of etapa.subs || []) {
          if (S.SUB[s]) return s;
        }
      }
    }
  }

  // 2. FAQ que tiene este concepto como árbol.nodo y pasaje "responde"
  for (const faq of Object.values(S.FAQ || {})) {
    if (faq.arbol?.nodo !== conceptId) continue;
    const subId = entrySubOfFaq(S, faq.id);
    if (subId) return subId;
  }

  // 3. NODE_UNIT (concepto es nodo funcional)
  if (S.NODE_UNIT?.[conceptId]?.sub) return S.NODE_UNIT[conceptId].sub;

  // 4. Si es un concepto estático que remite a uno funcional con NODE_UNIT
  const remFn = S.REM?.[conceptId]?.[0];
  if (remFn && S.NODE_UNIT?.[remFn]?.sub) return S.NODE_UNIT[remFn].sub;

  // 5. Sub-unidad con presencia en conceptos_clave
  for (const [subId, sub] of Object.entries(S.SUB || {})) {
    if ((sub.conceptos_clave || []).includes(conceptId)) return subId;
  }

  return null;
}

// ── Detección por concepto (fallback de FAQ) ──
export function detectConcept(S, text) {
  const t = normalize(text);
  if (!t) return null;

  const tWords = new Set(tokenize(t, 3, true));
  const parsed = analyze(text);
  const lexConceptIds = new Set(parsed.conceptos.map(c => c.id));

  const candidates = [];
  const seen = new Set();

  const tryMatch = (id, n, kind) => {
    if (seen.has(id) || !n) return;

    const labelWords = tokenize(normalize(n.label || ''), 3, true);
    const grWords = tokenize(normalize(n.gr || ''), 3, false);

    let hits = 0;
    for (const w of labelWords) {
      if (tWords.has(w)) hits++;
    }
    for (const w of grWords) {
      if (tWords.has(w)) hits += 1.5;
    }
    if (lexConceptIds.has(id)) hits += 10;
    if (normalize(n.gr) === t || grWords.length === 1 && tWords.has(grWords[0])) hits += 2;

    if (hits === 0) return;
    seen.add(id);

    candidates.push({
      id,
      label: n.label || id,
      gr: n.gr || '',
      hits,
      kind,
      hasDefinition: !!(S.DEFC?.[id]?.length),
    });
  };

  for (const [id, n] of Object.entries(S.N || {})) tryMatch(id, n, 'static');
  for (const [id, n] of Object.entries(S.FN || {})) tryMatch(id, n, 'functional');

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (b.hits !== a.hits) return b.hits - a.hits;
    if (a.hasDefinition !== b.hasDefinition) return b.hasDefinition - a.hasDefinition;
    return (a.kind === 'functional' ? -1 : 1);
  });

  const best = candidates[0];
  return {
    type: 'concept',
    id: best.id,
    label: best.label,
    gr: best.gr,
    hasDefinition: best.hasDefinition,
    targetSub: resolveTargetSub(S, best.id),
  };
}

// ── Detección principal ──
// Son umbrales de reglas, no probabilidades estadísticas.
export const DETECTION_RULES = Object.freeze({ safeScore: 6, weakScore: 3.5, minMargin: 1.25 });

function relatedConcepts(S, id) {
  return new Set([id, ...(S.REM?.[id] || [])]);
}

function matchesConcept(S, a, b) {
  const left = relatedConcepts(S, a);
  return [...relatedConcepts(S, b)].some(id => left.has(id));
}

function signatureArgs(firma) {
  return [...new Set((firma.arguments || []).flatMap(a =>
    String(a).replace(/^[^:]+:/, '').split('#')[0].split('--')))];
}

export function diagnose(S, text) {
  const normalized = normalize(text);
  const parsed = analyze(text);
  const lexical = parsed.conceptos.filter(c => S.N?.[c.id] || S.FN?.[c.id]);
  const fallback = detectConcept(S, text);
  const concepts = lexical.length ? lexical : fallback ? [{ id: fallback.id, word: fallback.label }] : [];
  const primaryMode = parsed.primaryMode?.id || null;
  const candidates = S.repo.faqs().map(faq => {
    const sources = [faq.pregunta, ...(faq.variantes || []),
      ...(faq.firmas || []).map(f => f.label).filter(Boolean)];
    const exactSource = normalized && sources.find(s => normalize(s) === normalized) || null;
    const textScore = scoreMatch(normalized, sources);
    const signatures = (faq.firmas || []).map(firma => {
      const args = signatureArgs(firma);
      const matched = concepts.filter(c => args.some(a => matchesConcept(S, c.id, a)));
      const missingArguments = args.filter(a => !concepts.some(c => matchesConcept(S, c.id, a)));
      const unmatchedConcepts = concepts.filter(c => !matched.includes(c)).map(c => c.id);
      const modeCompatible = !primaryMode || firma.intent === primaryMode;
      const conceptScore = matched.length * 2.5;
      const modeScore = primaryMode && modeCompatible ? 2 : 0;
      const penalty = missingArguments.length * 1.25 + unmatchedConcepts.length * 3;
      return { firma, matchedConcepts: matched.map(c => c.id), missingArguments,
        unmatchedConcepts, modeCompatible, conceptScore, modeScore, penalty,
        score: conceptScore + modeScore - penalty };
    }).sort((a, b) => b.score - a.score);
    const signature = signatures[0] || null;
    const reasons = [];
    const targetSub = entrySubOfFaq(S, faq.id);
    if (!targetSub && !(faq.exposicion_directa && faq.respuesta?.some(r => r.rol === 'responde' && r.t))) reasons.push('La FAQ no tiene un pasaje de entrada válido.');
    if (!exactSource) {
      if (!signature?.matchedConcepts.length) reasons.push('No comparte un concepto reconocido.');
      if (signature?.unmatchedConcepts.length) reasons.push('La firma no cubre todos los conceptos de la consulta.');
      if (signature?.missingArguments.length) reasons.push('Faltan argumentos de la firma.');
      if (!signature?.modeCompatible) reasons.push('El modo de pregunta no coincide con la firma.');
    }
    const score = (exactSource ? 20 : Math.min(textScore, 3)) + (signature?.score || 0);
    return { id: faq.id, label: faq.pregunta, targetSub, exactSource, textScore,
      conceptScore: signature?.conceptScore || 0, modeScore: signature?.modeScore || 0,
      penalty: signature?.penalty || 0, score, signature, eligible: !reasons.length, reasons };
  }).sort((a, b) => Number(!!b.exactSource) - Number(!!a.exactSource) || b.score - a.score);
  const eligible = candidates.filter(c => c.eligible);
  const best = eligible[0];
const margin = best ? best.score - (eligible[1]?.score ?? 0) : 0;
  let status = 'none', goal = null, reason = 'No se reconoció una pregunta o concepto del corpus.';
  const exactMatches = eligible.filter(c => c.exactSource);
  if (exactMatches.length > 1) {
    status = 'ambiguous';
    reason = 'La misma formulación aparece en varias FAQ del corpus; es necesario elegir una interpretación.';
  } else if (best && (best.exactSource || best.score >= DETECTION_RULES.safeScore && margin >= DETECTION_RULES.minMargin)) {
    status = 'safe';
    goal = { type: 'faq', id: best.id, label: best.label, targetSub: best.targetSub,
      faqDefinicion: S.FAQ[best.id]?.definicion || null };
    reason = best.exactSource ? 'Coincidencia exacta con una pregunta o variante del corpus.' : 'Firma compatible, conceptos cubiertos y margen suficiente.';
  } else if (concepts.length === 1 && fallback?.targetSub) {
    status = 'weak';
    goal = fallback;
    reason = 'Se reconoce el concepto, pero no hay una FAQ suficientemente específica para esta consulta.';
  } else if (concepts.length > 1 || best?.score >= DETECTION_RULES.weakScore) {
    status = 'ambiguous';
    reason = 'Hay varias interpretaciones posibles; hace falta precisar la pregunta.';
  }
  const choices = exactMatches.length > 1 ? exactMatches.map(c => ({ type: 'faq', id: c.id,
    label: c.label, targetSub: c.targetSub })) : concepts.map(c => ({ type: 'concept', id: c.id,
    label: S.N?.[c.id]?.label || S.FN?.[c.id]?.label || c.word,
    targetSub: resolveTargetSub(S, c.id) })).filter(c => c.targetSub);
  return { raw: text, normalized, analysis: parsed, concepts, primaryMode, status,
    reason, goal, margin, thresholds: DETECTION_RULES, candidates, choices };
}

export function detect(S, text) {
  return diagnose(S, text).goal;
}
