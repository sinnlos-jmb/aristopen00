const ASC = new Set([
  'impulso','actualiza','perfecciona','genera','principio','camino',
  'lleva_a','culmina','afin','atraccion','tiende','fin','fin_potencial','completa',
]);
const MED = new Set([
  'es','uso','condicion','subordinado','obedece','metodo','peso','ordena',
  'regula','forma','produce','determina','reside','esfera','al_servicio',
  'realizable','mas_completo','pros_hen','confirma',
]);
const LAT = new Set(['acompana','contraste','oyente','reduccion','vacia']);
const ARE = new Set(['arete','arete_ethike','arete_dianoetike','excelencia']);
const VOZ_SCORE = { textual: 1.0, comentarista: 0.6, nuestra: 0.3 };

export function relKind(rel) {
  if (ASC.has(rel)) return 'asc';
  if (MED.has(rel)) return 'med';
  if (LAT.has(rel)) return 'lat';
  return 'med';
}

function edgeQuality(edge) {
  const kind = relKind(edge.rel);
  const voz = VOZ_SCORE[edge.voz] ?? 0.3;
  const ref = edge.ref ? 0.3 : 0;
  const motor = (ARE.has(edge.de) || ARE.has(edge.a)) ? 0.4 : 0;
  const base = kind === 'asc' ? 1.0 : kind === 'med' ? 0.6 : 0.2;
  return base * (0.5 + voz * 0.5) + ref + motor;
}

export function buildFunctionalGraph(S) {
  const adj = new Map();
  for (const id of Object.keys(S.FN || {})) adj.set(id, []);
  for (const e of S.FE || []) {
    if (!adj.has(e.de) || !adj.has(e.a)) continue;
    const cost = 1 / Math.max(0.1, edgeQuality(e));
    adj.get(e.de).push({ to: e.a, edge: e, cost, dir: 1 });
    adj.get(e.a).push({ to: e.de, edge: e, cost, dir: -1 });
  }
  return adj;
}

export function findFunctionalPaths(adj, from, to, opts = {}) {
  const { K = 6, maxDepth = 9, beamWidth = 40 } = opts;
  if (!adj.has(from) || !adj.has(to)) return [];

  let frontier = [{ path: [from], cost: 0, edges: [] }];
  const results = [];

  for (let depth = 0; depth < maxDepth; depth++) {
    const next = [];
    for (const node of frontier) {
      const last = node.path[node.path.length - 1];
      if (last === to) { results.push(node); continue; }
      for (const edge of (adj.get(last) || [])) {
        if (node.path.includes(edge.to)) continue;
        next.push({
          path: [...node.path, edge.to],
          cost: node.cost + edge.cost,
          edges: [...node.edges, { edge: edge.edge, dir: edge.dir }],
        });
      }
    }
    next.sort((a, b) => a.cost - b.cost);
    frontier = next.slice(0, beamWidth);
    if (frontier.length === 0) break;
  }
  for (const node of frontier) {
    if (node.path[node.path.length - 1] === to) results.push(node);
  }

  const seen = new Set();
  const deduped = [];
  for (const r of results.sort((a, b) => a.cost - b.cost)) {
    const key = r.path.join('→');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
    if (deduped.length >= K) break;
  }
  return deduped;
}

// NUEVA: paths que pasan OBLIGATORIAMENTE por alguno de los `required`.
// Combina segmentos: from → R (R ∈ required) y R → to.
export function findPathsThroughRequired(adj, from, to, required, opts = {}) {
  if (!adj.has(from) || !adj.has(to)) return [];
  const K = opts.K ?? 6;
  const maxCombinedLength = opts.maxCombinedLength ?? 11;
  const results = [];
  const seen = new Set();

  for (const R of required) {
    if (!adj.has(R) || R === from || R === to) continue;
    const seg1 = findFunctionalPaths(adj, from, R, { K, maxDepth: 8, beamWidth: 30 });
    const seg2 = findFunctionalPaths(adj, R, to, { K, maxDepth: 8, beamWidth: 30 });
    for (const p1 of seg1) {
      for (const p2 of seg2) {
        const combinedPath = [...p1.path, ...p2.path.slice(1)];
        const combinedEdges = [...p1.edges, ...p2.edges];
        if (combinedPath.length > maxCombinedLength) continue;

        // Detectar ciclos
        const nodeSet = new Set();
        let hasCycle = false;
        for (const id of combinedPath) {
          if (nodeSet.has(id)) { hasCycle = true; break; }
          nodeSet.add(id);
        }
        if (hasCycle) continue;

        const key = combinedPath.join('→');
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          path: combinedPath,
          edges: combinedEdges,
          cost: p1.cost + p2.cost,
          forced: R,
        });
      }
    }
  }

  return results;
}

export function scorePath(path, edges) {
  const n = edges.length;
  if (!n) return { score: 0, n: 0, asc: 0, med: 0, lat: 0, ascRatio: 0,
    vozAvg: 0, refRatio: 0, refCount: 0, motorTouches: 0, motorPos: 'ninguna', rels: [], reversed: 0 };
  let asc = 0, med = 0, lat = 0;
  let vozSum = 0, refCount = 0, motorTouches = 0;
  let aretePos = -1, eudaimoniaPos = -1;
  const rels = [];
  let reversed = 0;

  edges.forEach(({ edge, dir }, i) => {
    if (dir === -1) reversed++;
    const kind = relKind(edge.rel);
    rels.push(kind);
    if (kind === 'asc') asc++;
    else if (kind === 'med') med++;
    else lat++;
    vozSum += VOZ_SCORE[edge.voz] ?? 0.3;
    if (edge.ref) refCount++;
    if (ARE.has(edge.de) || ARE.has(edge.a)) {
      motorTouches++;
      if (aretePos === -1) aretePos = i;
    }
    if (edge.de === 'eudaimonia' || edge.a === 'eudaimonia') {
      if (eudaimoniaPos === -1) eudaimoniaPos = i;
    }
  });

  const vozAvg = vozSum / n;
  const refRatio = refCount / n;
  const ascRatio = asc / n;

  let motorPos = 'ninguna';
  if (motorTouches > 0) {
    if (eudaimoniaPos === -1) motorPos = 'media';
    else motorPos = aretePos < eudaimoniaPos ? 'buena' : 'tardía';
  }

  const lengthFactor = Math.min(1, 5 / n);
  const motorBonus = motorPos === 'buena' ? 1.0
                   : motorPos === 'media' ? 0.6
                   : motorPos === 'tardía' ? 0.2 : 0;
  const latPenalty = lat * 0.3;

  const score = ascRatio * 2.0
    + (med / n) * 0.8
    + vozAvg * 0.5
    + refRatio * 0.8
    + motorBonus * 1.2
    + lengthFactor * 0.5
    - latPenalty - reversed * 0.25;

  return {
    score, n, asc, med, lat, ascRatio, vozAvg, refRatio,
    refCount, motorTouches, motorPos, rels, reversed,
  };
}
