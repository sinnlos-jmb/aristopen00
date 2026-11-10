export const normalize = value => String(value || '')
  .normalize('NFD')
  .replace(/\p{M}/gu, '')
  .toLocaleLowerCase('es')
  .replace(/ς/g, 'σ')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

const words = value => normalize(value).split(/\s+/).filter(Boolean);

export const SOURCE_GROUPS = {
  paragraphs: { label: 'Párrafos', description: 'Texto griego y traducción agrupados' },
  notes: { label: 'Notas y comentarios', description: 'Notas de párrafos, subunidades y tags previos' },
  units: { label: 'Unidades y subunidades', description: 'Resúmenes, introducciones y destinos' },
  static_concepts: { label: 'Conceptos del árbol estático', description: 'Conceptos y categorías, sin sus sentidos' },
  static_senses: { label: 'Sentidos específicos', description: 'Sentidos diferenciados de cada concepto' },
  functional_nodes: { label: 'Nodos de la red funcional', description: 'Categorías, subcategorías y anclas' },
  functional_edges: { label: 'Aristas funcionales', description: 'Las 74 relaciones de la red funcional' },
  graph_cards: { label: 'Fichas de grafos', description: 'Nodos y campos de los once grafos' },
  graph_edges: { label: 'Aristas de grafos', description: 'Relaciones de los grafos, con o sin voz revisada' },
  pedagogical: { label: 'FAQ y material pedagógico', description: 'FAQ, pilares, claves, definiciones y decisiones' },
};

export function sourceGroup(item) {
  if (item.source === 'texto' && ['parrafo', 'paragraph_group'].includes(item.kind)) return 'paragraphs';
  if (item.source === 'nota' || item.source === 'tag_previo') return 'notes';
  if (item.source === 'unidad' || item.source === 'subunidad') return 'units';
  if (item.source === 'estatico' && item.kind === 'sentido') return 'static_senses';
  if (item.source === 'estatico') return 'static_concepts';
  if (item.source === 'funcional' && item.kind === 'arista') return 'functional_edges';
  if (item.source === 'funcional') return 'functional_nodes';
  if (item.source === 'grafo' && item.kind === 'arista') return 'graph_edges';
  if (item.source === 'grafo') return 'graph_cards';
  return 'pedagogical';
}

export function searchLexical(corpus, query, options = {}) {
  const q = normalize(query);
  const selected = [...new Set(options.criteria || [])].slice(0, corpus.policy?.maxCriteria || 3);
  const sources = new Set(options.sources?.length ? options.sources.filter(x => SOURCE_GROUPS[x]) : ['paragraphs']);
  if (!q && !selected.length) return [];
  const tokens = [...new Set(words(q))];
  const scope = options.scope === 'all' ? 'all' : 'en1';
  const limit = Math.max(5, Math.min(50, Number(options.limit) || 20));
  const results = [];

  for (const item of corpus.fragments) {
    if (!item.scopes.includes(scope)) continue;
    if (!sources.has(sourceGroup(item))) continue;
    const lexical = lexicalScore(item, q, tokens);
    const matches = selected.map(id => matchCriterion(corpus, item, id)).filter(Boolean);
    if (selected.length && !matches.length) continue;
    if (q && !lexical.score) continue;
    const crossing = matches.length;
    const structuredScore = matches.reduce((sum, x) => sum + x.score, 0);
    const score = (selected.length ? crossing * 220 + structuredScore : 0) + lexical.score + (item.role === 'evidencia' ? 1 : 0);
    const reasons = [
      ...matches.map(x => x.reason),
      ...lexical.reasons,
    ];

    results.push({
      item,
      score: Math.round(score * 10) / 10,
      reasons: [...new Set(reasons)],
      matches,
      crossing,
      snippet: snippet(item.text, query),
    });
  }

  return groupParagraphs(results, corpus, query)
    .sort((a, b) => b.crossing - a.crossing || b.score - a.score || a.item.title.localeCompare(b.item.title, 'es'))
    .slice(0, limit);
}

export function groupParagraphs(results, corpus, query) {
  const out = [], paragraphs = new Map();
  const byId = corpus.byId || new Map(corpus.fragments.map(x => [x.id, x]));
  for (const result of results) {
    const n = result.item.source === 'texto' && result.item.kind === 'parrafo' ? result.item.meta?.paragraph : null;
    if (n == null) { out.push(result); continue; }
    if (!paragraphs.has(n)) paragraphs.set(n, []);
    paragraphs.get(n).push(result);
  }
  for (const [number, parts] of paragraphs) {
    const es = parts.find(x => x.item.language === 'es'), gr = parts.find(x => x.item.language === 'gr');
    const esItem = es?.item || byId.get(`texto:p${number}:es`);
    const grItem = gr?.item || byId.get(`texto:p${number}:gr`);
    const best = parts.slice().sort((a, b) => b.score - a.score)[0];
    const matches = new Map();
    parts.flatMap(x => x.matches || []).forEach(m => {
      if (!matches.has(m.criterionId) || matches.get(m.criterionId).score < m.score) matches.set(m.criterionId, m);
    });
    const itemParts = [grItem, esItem].filter(Boolean);
    out.push({
      ...best,
      score: Math.max(...parts.map(x => x.score)) + (parts.length > 1 ? 2 : 0),
      crossing: matches.size,
      matches: [...matches.values()],
      reasons: [...new Set(parts.flatMap(x => x.reasons))],
      snippet: es?.snippet || (esItem ? snippet(esItem.text, query) : best.snippet),
      item: {
        id: `paragraph:${number}`,
        source: 'texto',
        kind: 'paragraph_group',
        refId: String(number),
        title: `Párrafo ${number}`,
        text: esItem?.text || grItem?.text || '',
        language: 'mixta',
        voices: ['textual', 'traduccion'],
        voiceStatus: 'estructurada',
        role: 'evidencia',
        ref: esItem?.ref || grItem?.ref || null,
        url: esItem?.url || grItem?.url || null,
        meta: { paragraph: number },
        parts: itemParts,
      },
    });
  }
  return out;
}

function lexicalScore(item, q, tokens) {
  if (!q) return { score: 0, reasons: [] };
  const title = normalize(item.title);
  const text = item.normalized;
  const textWords = text.split(/\s+/);
  const titleWords = title.split(/\s+/);
  const haystackWords = new Set(textWords);
  let score = 0;
  const reasons = [];
  if (title === q) { score += 60; reasons.push('título exacto'); }
  else if (title.includes(q)) { score += 28; reasons.push('frase en el título'); }
  if (text.includes(q)) { score += q.includes(' ') ? 24 : 13; reasons.push('frase exacta'); }
  let exact = 0, partial = 0, titleHits = 0;
  for (const token of tokens) {
    if (haystackWords.has(token)) { exact += 1; score += 6; }
    if (titleWords.includes(token)) { titleHits += 1; score += 8; }
    if (token.length >= 4 && !haystackWords.has(token) && textWords.some(w => w.length >= 3 && (w.startsWith(token) || token.startsWith(w)))) {
      partial += 1; score += 1.5;
    }
  }
  if (exact) reasons.push(`${exact}/${tokens.length} término${exact === 1 ? '' : 's'} exacto${exact === 1 ? '' : 's'}`);
  if (titleHits) reasons.push(`${titleHits} en el título`);
  if (partial) reasons.push(`${partial} coincidencia${partial === 1 ? '' : 's'} parcial${partial === 1 ? '' : 'es'}`);
  if (tokens.length > 1 && exact === tokens.length) { score += 12; reasons.push('cobertura completa'); }
  return { score, reasons };
}

export function matchCriterion(corpus, item, selectedId) {
  const selected = corpus.criterionById.get(selectedId);
  if (!selected) return null;
  let best = null;
  for (const direct of item.criteria || []) {
    let distance = null;
    if (direct.id === selectedId) distance = 0;
    else if (selected.type === 'functional_category' || selected.type === 'functional_node' || selected.type === 'static_concept') {
      distance = descendantDistance(corpus, direct.id, selectedId);
    }
    if (distance == null) continue;
    const weight = Math.pow(corpus.policy?.descendantsWeight || .68, distance);
    const score = Math.round(120 * weight * (direct.strength || .86) * 10) / 10;
    const chosen = {
      criterionId: selectedId,
      linkedId: direct.id,
      distance,
      score,
      via: direct.via,
      detail: direct.detail,
      reason: distance
        ? `${selected.label}: descendiente a ${distance} nivel${distance === 1 ? '' : 'es'} · ${direct.via}`
        : `${selected.label}: ${direct.via}`,
    };
    if (!best || chosen.score > best.score) best = chosen;
  }
  return best;
}

function descendantDistance(corpus, childId, ancestorId) {
  let current = corpus.criterionById.get(childId), distance = 0;
  while (current?.parentId) {
    distance += 1;
    if (current.parentId === ancestorId) return distance;
    current = corpus.criterionById.get(current.parentId);
  }
  return null;
}

export function snippet(text, rawQuery, length = 340) {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  if (flat.length <= length) return flat;
  const raw = String(rawQuery || '').trim().toLocaleLowerCase('es');
  const at = raw ? flat.toLocaleLowerCase('es').indexOf(raw) : -1;
  const start = Math.max(0, at < 0 ? 0 : at - Math.floor(length * .3));
  const end = Math.min(flat.length, start + length);
  return `${start ? '…' : ''}${flat.slice(start, end).trim()}${end < flat.length ? '…' : ''}`;
}
