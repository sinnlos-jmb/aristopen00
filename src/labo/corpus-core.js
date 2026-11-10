// Núcleo extraído del generador actual. Fuentes y funciones de tagueo inyectadas.
import crypto from 'node:crypto';
export function generarCorpus(sources, {build, anchorsOf}, generated = new Date().toISOString()) {
const VOICES = new Set(['textual', 'comentarista', 'nuestra', 'traduccion', 'endoxa']);

const clean = x => String(x ?? '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const norm = x => clean(x).normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').replace(/ς/g, 'σ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const uniq = xs => [...new Set(xs.filter(Boolean))];
const en1In = x => /\bEN\s+I(?:\.|,|\b)/i.test(String(x || ''));
const bekkerText = n => {
  if (!Number.isFinite(n)) return null;
  const page = Math.floor(n / 100);
  const offset = n - page * 100;
  const column = offset >= 50 ? 'b' : 'a';
  const line = offset - (column === 'b' ? 50 : 0);
  return `${page}${column}${Math.max(1, line)}`;
};

const { tags, estatico, funcional, refsIndex, textRaw, graphIndex, graphs } = sources;
const S = build({ txt: textRaw, estatico, funcional, tags, refs: refsIndex, graphIndex });
const paragraphs = S.pars;
const fragments = [];
const ids = new Set();

function add(input) {
  const text = clean(input.text);
  if (!text) return;
  if (!input.id || ids.has(input.id)) throw new Error(`ID de fragmento repetido o vacío: ${input.id}`);
  ids.add(input.id);
  const voices = uniq([].concat(input.voices || input.voice || []).filter(v => VOICES.has(v)));
  const structured = input.voiceStatus
    ? input.voiceStatus === 'estructurada'
    : voices.length > 0;
  const ref = clean(input.ref);
  const refs = input.refs || [];
  const en1 = input.en1 ?? (en1In(ref) || refs.some(r => r.work === 'EN' && /^I(?:\.|$)/.test(r.chapter || '')));
  const title = clean(input.title);
  const item = {
    id: input.id,
    source: input.source,
    kind: input.kind,
    refId: input.refId || null,
    title,
    text,
    language: input.language || 'es',
    voices,
    voiceStatus: structured ? 'estructurada' : 'no_estructurada',
    voiceOrigin: input.voiceOrigin || (voices.length ? 'explicita' : 'ausente'),
    role: input.role || (structured ? 'evidencia' : 'indice'),
    ref: ref || null,
    refs,
    bekker: input.bekker || null,
    scopes: en1 ? ['en1', 'all'] : ['all'],
    url: input.url || null,
    meta: input.meta || {},
  };
  item.normalized = norm(`${title}\n${text}\n${ref}`);
  item.contentHash = hash(JSON.stringify({
    source: item.source, kind: item.kind, title: item.title, text: item.text,
    language: item.language, voices: item.voices, ref: item.ref, refs: item.refs,
    bekker: item.bekker, url: item.url, meta: item.meta,
  }));
  fragments.push(item);
}

// Texto base: se separan el original griego y la traducción.
for (const p of paragraphs) {
  const bkIni = bekkerText(p.bk_a ?? p.bk_ini_n) || p.bk_ini;
  const bkFin = bekkerText(p.bk_b ?? p.bk_fin_n) || bkIni;
  const ref = `EN I.${p.cap}, ${bkIni}${bkFin === bkIni ? '' : `–${bkFin}`}`;
  const url = `../tagueo/#/parrafo/${p.nro}`;
  add({
    id: `texto:p${p.nro}:gr`, source: 'texto', kind: 'parrafo', refId: String(p.nro),
    title: `Párrafo ${p.nro} · griego`, text: p.gr, language: 'gr', voice: 'textual',
    ref, bekker: [bkIni, bkFin], en1: true, url, meta: { paragraph: p.nro, chapter: p.cap },
  });
  add({
    id: `texto:p${p.nro}:es`, source: 'texto', kind: 'parrafo', refId: String(p.nro),
    title: `Párrafo ${p.nro} · traducción`, text: p.es, language: 'es', voice: 'traduccion',
    ref, bekker: [bkIni, bkFin], en1: true, url, meta: { paragraph: p.nro, chapter: p.cap },
  });
}

// Notas de párrafo y veredictos de tags anteriores.
for (const p of tags.parrafos) {
  const url = `../tagueo/#/parrafo/${p.parrafo}`;
  (p.notas || []).forEach((n, i) => add({
    id: `nota:p${p.parrafo}:${i + 1}`, source: 'nota', kind: 'nota_parrafo',
    refId: `${p.parrafo}:${i + 1}`, title: `Nota del párrafo ${p.parrafo}`,
    text: n.t, voice: n.voz, ref: n.bekker ? `EN I, ${n.bekker}` : '',
    bekker: n.bekker ? [n.bekker, n.bekker] : null, en1: true, url,
    meta: { paragraph: p.parrafo, status: p.estado, ...(n.c?.length ? { concepts: n.c } : {}) },
  }));
}
for (const [p, x] of Object.entries(tags.tags_previos || {})) add({
  id: `tag-previo:p${p}`, source: 'tag_previo', kind: 'veredicto', refId: p,
  title: `Veredicto del tag previo · párrafo ${p}`, text: `${x.veredicto}. ${x.t}`,
  voice: 'nuestra', voiceOrigin: 'derivada_proyecto', en1: true,
  url: `../tagueo/#/parrafo/${p}`, meta: { paragraph: Number(p), verdict: x.veredicto },
});

// Unidades y subunidades. Las introducciones y resúmenes son redacción pedagógica del proyecto.
for (const u of tags.unidades) {
  if (u.resumen) add({
    id: `unidad:${u.id}:resumen`, source: 'unidad', kind: 'resumen', refId: u.id,
    title: u.titulo, text: u.resumen, voice: 'nuestra', voiceOrigin: 'derivada_proyecto',
    en1: true, url: `../tagueo/#/unidad/${u.id}`, meta: { unit: u.id },
  });
  for (const s of u.subunidades) {
    const ref = `EN I, ${s.bekker?.[0] || ''}–${s.bekker?.[1] || ''}`;
    const url = `../tagueo/#/unidad/${u.id}/${encodeURIComponent(s.id)}`;
    if (s.intro) add({
      id: `sub:${s.id}:intro`, source: 'subunidad', kind: 'intro', refId: s.id,
      title: `${u.titulo} · ${s.titulo}`, text: s.intro, voice: 'nuestra',
      voiceOrigin: 'derivada_proyecto', ref, bekker: s.bekker, en1: true, url,
      meta: { unit: u.id, subunit: s.id, movements: s.movimientos || [] },
    });
    (s.notas || []).forEach((n, i) => add({
      id: `sub:${s.id}:nota:${i + 1}`, source: 'nota', kind: 'nota_subunidad',
      refId: `${s.id}:${i + 1}`, title: `${s.titulo} · nota`, text: n.t,
      voice: n.voz, ref: n.ref || ref, bekker: s.bekker, en1: true, url,
      meta: { unit: u.id, subunit: s.id, ...(n.c?.length ? { concepts: n.c } : {}) },
    }));
    (s.relaciones || []).forEach((r, ri) => (r.destinos || []).forEach((d, di) => add({
      id: `sub:${s.id}:destino:${ri + 1}:${di + 1}`, source: 'subunidad', kind: 'destino',
      refId: `${s.id}:${ri + 1}:${di + 1}`, title: `${s.titulo} · ${d.tipo}`,
      text: d.t, voice: r.voz, ref: d.ref || ref, bekker: s.bekker, en1: true, url,
      meta: { unit: u.id, subunit: s.id, relation: r.rel, destinationType: d.tipo, edge: d.arista || null },
    })));
  }
}

// FAQ y registros pedagógicos.
for (const f of tags.faqs) add({
  id: `faq:${f.id}`, source: 'faq', kind: 'pregunta', refId: f.id,
  title: f.pregunta, text: [f.pregunta, ...(f.variantes || [])].join('\n'),
  voice: 'nuestra', voiceOrigin: 'derivada_proyecto', role: 'indice',
  en1: true, url: `../tagueo/#/faq/${f.id}`,
  meta: { passages: f.pasajes || [], tree: f.arbol || null, also: f.tambien || [] },
});
const subBekker = new Map(tags.unidades.flatMap(u => u.subunidades.map(s => [s.id, s.bekker || null])));
for (const f of tags.faqs) (f.respuesta || []).forEach((a, i) => add({
  id: `faq:${f.id}:respuesta:${i + 1}`, source: 'faq', kind: a.estado === 'borrador' ? 'respuesta_borrador' : a.estado ? 'respuesta' : 'respuesta_sin_estado', refId: `${f.id}:${i + 1}`, 
  title: `${f.pregunta} · respuesta (${a.estado || 'sin estado indicado'})`, text: a.t,
  voice: a.voz, role: 'indice', ref: a.ref, bekker: subBekker.get(a.sub) || null, en1: true, url: `../tagueo/#/faq/${f.id}`,
  meta: { faq: f.id, subunit: a.sub || null, answerRole: a.rol, status: a.estado ?? null },
}));
(tags.pilares || []).forEach(p => add({
  id: `pilar:${p.id}`, source: 'pilar', kind: 'pilar', refId: p.id,
  title: p.label || 'Pilar', text: p.t, voice: p.voz,
  voiceStatus: p.voz ? 'estructurada' : 'no_estructurada',
  role: p.voz ? 'evidencia' : 'indice', ref: p.ref, url: p.faq ? `../tagueo/#/faq/${p.faq}` : '../tagueo/#/faq',
  meta: { pillar: p.id },
}));
(tags.para_profundizar || []).forEach((p, i) => add({
  id: `profundizar:${p.id || i + 1}`, source: 'profundizar', kind: 'tema',
  refId: p.id || String(i + 1), title: p.tema, text: p.t, ref: p.ref,
  voiceStatus: 'no_estructurada', role: 'indice', url: '../tagueo/#/decisiones',
  meta: { where: p.donde || [] },
}));
(tags.claves || []).forEach(k => add({
  id: `clave:${k.id}`, source: 'clave', kind: 'clave_lectura', refId: k.id,
  title: k.label || k.nombre, text: k.aporta || k.t, voice: k.voz,
  ref: k.ref, url: `../tagueo/#/estatico/${k.nodo}`, meta: { concept: k.nodo },
}));
const subToUnit = new Map(tags.unidades.flatMap(u => u.subunidades.map(s => [s.id, u.id])));
function tagAnchorUrl(anchor) {
  if (anchor?.startsWith('sub:')) {
    const sub = anchor.slice(4), unit = subToUnit.get(sub);
    return unit ? `../tagueo/#/unidad/${unit}/${encodeURIComponent(sub)}` : '../tagueo/#/unidad';
  }
  if (anchor?.startsWith('unidad:')) return `../tagueo/#/unidad/${anchor.slice(7)}`;
  if (anchor?.startsWith('super:')) return `../tagueo/#/mapa/${anchor.slice(6)}`;
  return '../tagueo/#/faq';
}
(tags.definiciones || []).forEach(d => (d.etapas || []).forEach(e => add({
  id: `def:${d.id}:etapa:${e.n}`, source: 'definicion', kind: 'etapa', refId: `${d.id}:${e.n}`,
  title: `${d.titulo} · etapa ${e.n}`, text: [e.t, e.gr].filter(Boolean).join('\n'),
  language: e.gr && !e.t ? 'gr' : 'mixta', voice: e.voz, ref: e.ref,
  url: tagAnchorUrl(e.a),
  meta: { definition: d.id, stage: e.n, level: e.nivel, anchor: e.a || null },
})));
(tags.decisiones || []).forEach(d => add({
  id: `decision:${d.id}`, source: 'decision', kind: 'decision', refId: d.id,
  title: `${d.id} · ${d.estado}`, text: d.texto, voice: 'nuestra',
  voiceOrigin: 'derivada_proyecto', role: 'indice', url: '../tagueo/#/decisiones',
  meta: { status: d.estado },
}));

// Árbol estático: la voz del sentido se hereda de su concepto cuando no está declarada.
function walkStatic(nodes, inheritedVoice = null) {
  for (const n of nodes || []) {
    const voice = n.voz || inheritedVoice;
    const text = [n.gr, n.def].filter(Boolean).join('\n');
    if (text) add({
      id: `estatico:${n.id}`, source: 'estatico', kind: 'concepto', refId: n.id,
      title: n.label, text, voice, voiceStatus: voice ? 'estructurada' : 'no_estructurada',
      ref: n.ref, url: `../tagueo/#/estatico/${n.id}`,
      meta: { concept: n.id, relation: n.rel || null },
    });
    if (n.categoria?.nota) add({
      id: `estatico:${n.id}:categoria`, source: 'estatico', kind: 'categoria', refId: `${n.id}:categoria`,
      title: `${n.label} · ${n.categoria.label}`, text: n.categoria.nota,
      voice: n.categoria.voz, ref: n.ref, url: `../tagueo/#/estatico/${n.id}`,
      meta: { concept: n.id },
    });
    (n.sentidos || []).forEach(s => add({
      id: `estatico:${n.id}:sentido:${s.id}`, source: 'estatico', kind: 'sentido',
      refId: `${n.id}#${s.id}`, title: `${n.label} · ${s.label}`, text: [n.gr, s.label].filter(Boolean).join('\n'),
      voice: s.voz || voice, voiceStatus: (s.voz || voice) ? 'estructurada' : 'no_estructurada',
      ref: s.ref, url: `../tagueo/#/estatico/${n.id}`,
      meta: { concept: n.id, sense: s.id, anchor: s.ancla !== false },
    }));
    walkStatic(n.hijos, voice);
  }
}
walkStatic(estatico.raices);

// Red funcional: nodos como navegación; aristas como evidencia cuando tienen voz.
const fnodes = new Map();
function walkFunctional(nodes) {
  for (const n of nodes || []) {
    fnodes.set(n.id, n);
    add({
      id: `funcional:${n.id}`, source: 'funcional', kind: 'nodo', refId: n.id,
      title: n.label, text: [n.gr, ...(n.remite_a || []).map(x => `Remite a ${x}`)].filter(Boolean).join('\n'),
      voice: n.voz, voiceStatus: n.voz ? 'estructurada' : 'no_estructurada',
      role: 'navegacion', url: `../tagueo/#/funcional/${n.id}`,
      meta: { node: n.id, relation: n.rel || null, remitsTo: n.remite_a || [] },
    });
    walkFunctional(n.hijos);
  }
}
walkFunctional(funcional.categorias);
for (const e of funcional.aristas) {
  const from = fnodes.get(e.de)?.label || e.de, to = fnodes.get(e.a)?.label || e.a;
  add({
    id: `funcional:arista:${e.id}`, source: 'funcional', kind: 'arista', refId: e.id,
    title: `${from} → ${to}`, text: [`Relación: ${e.rel}`, e.label, e.nota].filter(Boolean).join('. '),
    voice: e.voz, ref: e.ref, url: `../tagueo/#/funcional/${e.de}`,
    meta: { edge: e.id, from: e.de, to: e.a, relation: e.rel, graph: e.grafo || null },
  });
}

// Grafos: los archivos de datos se evalúan en un contexto sin acceso al host (lib/fuentes-labo.mjs).
const graphVoices = new Map((tags.voces_grafos || []).map(v => [`${v.file}|${v.edge}`, v]));
const parsedRefs = new Map(refsIndex.entradas.map(x => [`${x.file}|${x.kind}|${x.id}`, x]));
const graphNodeConcepts = new Map();
const graphEdgeCriteria = [];

for (const { graph, data } of graphs) {
  for (const n of data.NODES) {
    graphNodeConcepts.set(`${graph.id}|${n.id}`, n.concepto || n.conceptId || n.id);
    const idx = parsedRefs.get(`${graph.file}|nodo|${n.id}`);
    add({
      id: `grafo:${graph.id}:nodo:${n.id}`, source: 'grafo', kind: 'nodo', refId: `${graph.file}|${n.id}`,
      title: `${graph.label} · ${n.label}`, text: [n.gr, n.desc].filter(Boolean).join('\n'),
      voiceStatus: 'no_estructurada', role: 'indice', ref: n.ref || idx?.raw,
      refs: idx?.refs || [], url: `../grafos/${graph.file}#${encodeURIComponent(n.id)}`,
      meta: { graph: graph.id, file: graph.file, node: n.id, conceptId: n.concepto || n.conceptId || null, type: n.type || null },
    });
  }
  for (const e of data.EDGES) {
    const idx = parsedRefs.get(`${graph.file}|arista|${e.id}`);
    const v = graphVoices.get(`${graph.file}|${e.id}`);
    graphEdgeCriteria.push({
      id: `gedge:${graph.file}|${e.id}`,
      type: 'graph_edge',
      label: e.title || e.label || e.id,
      greek: e.label || '',
      parentId: null,
      depth: 0,
      graph: graph.label,
      file: graph.file,
      entityId: e.id,
      from: e.source,
      to: e.target,
      relation: e.rel || null,
      voices: v?.voz || [],
      voiceStatus: v ? 'estructurada' : 'no_estructurada',
      ref: e.ref || idx?.raw || null,
      refCf: e.ref_cf || null,
    });
    add({
      id: `grafo:${graph.id}:arista:${e.id}`, source: 'grafo', kind: 'arista', refId: `${graph.file}|${e.id}`,
      title: `${graph.label} · ${e.title || e.label || e.id}`,
      text: [e.label, e.desc, v?.t].filter(Boolean).join('\n'),
      voices: v?.voz || [], voiceStatus: v ? 'estructurada' : 'no_estructurada',
      role: v ? 'evidencia' : 'indice', ref: e.ref || idx?.raw, refs: idx?.refs || [],
      url: `../grafos/${graph.file}#${encodeURIComponent(e.source)}`,
      meta: { graph: graph.id, file: graph.file, edge: e.id, from: e.source, to: e.target, relation: e.rel || null, ...(e.ref_cf ? { refCf: e.ref_cf } : {}) },
    });
  }
  for (const [id, field] of Object.entries(data.FIELDS || {})) if (field.note) add({
    id: `grafo:${graph.id}:campo:${id}`, source: 'grafo', kind: 'campo', refId: `${graph.file}|campo|${id}`,
    title: `${graph.label} · campo ${id}`, text: field.note,
    voiceStatus: 'no_estructurada', role: 'navegacion', url: `../grafos/${graph.file}`,
    meta: { graph: graph.id, file: graph.file, field: id, nodes: field.nodes || [] },
  });
}

// ---- Catálogo de criterios y vínculos estructurados de cada fragmento ----
// Esta capa será también la representación intermedia del futuro query builder.
const criterionCatalog = [];
const criterionIds = new Set();
const pushCriterion = x => {
  if (criterionIds.has(x.id)) throw new Error(`Criterio repetido: ${x.id}`);
  criterionIds.add(x.id);
  criterionCatalog.push(x);
};

function walkFunctionalCriteria(nodes, parentId = null, depth = 0, categoryId = null) {
  for (const n of nodes || []) {
    const id = `func:${n.id}`, cat = categoryId || n.id;
    pushCriterion({
      id, type: depth === 0 ? 'functional_category' : 'functional_node',
      label: n.label, greek: n.gr || '', parentId, depth, categoryId: cat,
      entityId: n.id, voices: n.voz ? [n.voz] : [], voiceStatus: n.voz ? 'estructurada' : 'no_estructurada',
      ref: n.ref || null,
    });
    walkFunctionalCriteria(n.hijos, id, depth + 1, cat);
  }
}
walkFunctionalCriteria(funcional.categorias);

function walkStaticCriteria(nodes, parentId = null, depth = 0) {
  for (const n of nodes || []) {
    const id = `static:${n.id}`;
    const anchors = anchorsOf(S, n.id, null).map(a => ({ id: `func:${a.f}`, via: a.via, from: a.de || n.id }));
    pushCriterion({
      id, type: 'static_concept', label: n.label, greek: n.gr || '', parentId, depth,
      entityId: n.id, voices: n.voz ? [n.voz] : [], voiceStatus: n.voz ? 'estructurada' : 'no_estructurada',
      ref: n.ref || null, anchors,
    });
    (n.sentidos || []).forEach(s => pushCriterion({
      id: `sense:${n.id}#${s.id}`, type: 'static_sense', label: `${n.label} · ${s.label}`,
      greek: n.gr || '', parentId: id, depth: depth + 1, entityId: `${n.id}#${s.id}`,
      conceptId: n.id, senseId: s.id, voices: (s.voz || n.voz) ? [s.voz || n.voz] : [],
      voiceStatus: (s.voz || n.voz) ? 'estructurada' : 'no_estructurada', ref: s.ref || null,
      anchors: anchorsOf(S, n.id, s.id).map(a => ({ id: `func:${a.f}`, via: a.via, from: a.de || `${n.id}#${s.id}` })),
    }));
    walkStaticCriteria(n.hijos, id, depth + 1);
  }
}
walkStaticCriteria(estatico.raices);

for (const e of funcional.aristas) {
  const from = S.FN[e.de]?.label || e.de, to = S.FN[e.a]?.label || e.a;
  pushCriterion({
    id: `fedge:${e.id}`, type: 'functional_edge', label: `${from} → ${to}`,
    greek: e.label || '', parentId: null, depth: 0, entityId: e.id,
    from: e.de, to: e.a, relation: e.rel, voices: [e.voz],
    voiceStatus: 'estructurada', ref: e.ref || null,
  });
}
graphEdgeCriteria.forEach(pushCriterion);

const VIA_STRENGTH = {
  'sentido exacto': 1.3,
  'ficha de sentido': 1.22,
  'ficha de concepto': 1.16,
  'nodo funcional': 1.16,
  'arista funcional': 1.3,
  'arista de grafo': 1.3,
  'arista de destino': 1.18,
  'tag de párrafo': 1.08,
  'concepto clave': 1,
  'ancla funcional': .94,
  'ubicación de FAQ': .92,
  'ver también en FAQ': .78,
  'nodo de grafo': .9,
  'concepto de nota': 1.12, // D42: los conceptos propios de la nota (c) pesan más que los heredados del párrafo o la subunidad.
  'extremo de arista': .82,
  'extremo de arista de grafo': .78,
  'definición por etapas': 1,
  'párrafo de subunidad': .66,
  'campo de grafo': .65,
  'párrafo de unidad': .48,
};
const link = (id, via, detail = null, strength = null) => ({ id, via, detail, strength: strength || VIA_STRENGTH[via] || .86 });
function mergeLinks(...groups) {
  const out = new Map();
  groups.flat(Infinity).filter(Boolean).forEach(x => {
    if (!criterionIds.has(x.id)) return;
    const old = out.get(x.id);
    if (!old) out.set(x.id, x);
    else if (x.detail && !String(old.detail || '').includes(x.detail)) old.detail = [old.detail, x.detail].filter(Boolean).join(' · ');
  });
  return [...out.values()];
}
function conceptLinks(concept, sense = null, via = 'concepto') {
  const out = [];
  const sourceStrength = VIA_STRENGTH[via] || .86;
  if (S.N[concept]) {
    out.push(link(`static:${concept}`, via, sense ? `${concept}#${sense}` : concept, sourceStrength));
    if (sense && (S.N[concept].sentidos || []).some(x => x.id === sense)) {
      out.push(link(`sense:${concept}#${sense}`, 'sentido exacto', `${concept}#${sense}`, Math.min(VIA_STRENGTH['sentido exacto'], sourceStrength)));
    }
    anchorsOf(S, concept, sense).forEach(a => out.push(link(
      `func:${a.f}`, 'ancla funcional', `${concept}${sense ? `#${sense}` : ''} · ${a.via}`,
      Math.min(VIA_STRENGTH['ancla funcional'], sourceStrength),
    )));
  }
  if (S.FN[concept]) out.push(link(`func:${concept}`, via, concept, sourceStrength));
  return out;
}
function paragraphLinks(number, via = 'tag de párrafo') {
  return mergeLinks((S.TP[number]?.conceptos || []).flatMap(k => conceptLinks(k.c, k.s, via)));
}
function subunitLinks(id) {
  const s = S.SUB[id];
  if (!s) return [];
  const own = (s.conceptos_clave || []).flatMap(c => conceptLinks(c, null, 'concepto clave'));
  const pars = (s.pars || []).flatMap(p => paragraphLinks(p, 'párrafo de subunidad'));
  return mergeLinks(own, pars);
}
function unitLinks(id) {
  const u = S.U[id];
  return u ? mergeLinks((u.parrafos || []).flatMap(p => paragraphLinks(p, 'párrafo de unidad'))) : [];
}
function faqLinks(id) {
  const f = S.FAQ[id];
  if (!f) return [];
  return mergeLinks(
    f.arbol?.nodo ? link(`func:${f.arbol.nodo}`, 'ubicación de FAQ', f.arbol.cat) : null,
    (f.tambien || []).map(x => link(`func:${x.nodo}`, 'ver también en FAQ', x.cat)),
  );
}
const definitions = new Map((tags.definiciones || []).map(d => [d.id, d]));
const pillars = new Map((tags.pilares || []).map(p => [p.id, p]));
const deepen = new Map((tags.para_profundizar || []).map((p, i) => [p.id || String(i + 1), p]));

for (const item of fragments) {
  const m = item.meta || {};
  let links = [];
  if (m.paragraph != null) links = paragraphLinks(m.paragraph);
  if (m.unit && !m.subunit) links = mergeLinks(links, unitLinks(m.unit));
  if (m.subunit) links = mergeLinks(links, subunitLinks(m.subunit));
  if (m.tree?.nodo) links = mergeLinks(links, link(`func:${m.tree.nodo}`, 'ubicación de FAQ', m.tree.cat), (m.also || []).map(x => link(`func:${x.nodo}`, 'ver también en FAQ', x.cat)));
  if (m.concept) links = mergeLinks(links, conceptLinks(m.concept, m.sense, item.kind === 'sentido' ? 'ficha de sentido' : 'ficha de concepto'));
  if (m.node && item.source === 'funcional') links = mergeLinks(links, link(`func:${m.node}`, 'nodo funcional', m.node));
  if (m.edge && item.source === 'funcional') links = mergeLinks(
    links, link(`fedge:${m.edge}`, 'arista funcional', m.relation),
    link(`func:${m.from}`, 'extremo de arista', m.edge), link(`func:${m.to}`, 'extremo de arista', m.edge),
  );
  if (m.graph && m.node) links = mergeLinks(links, conceptLinks(m.conceptId || graphNodeConcepts.get(`${m.graph}|${m.node}`), null, 'nodo de grafo'));
  if (m.graph && m.edge) {
    const fromConcept = graphNodeConcepts.get(`${m.graph}|${m.from}`);
    const toConcept = graphNodeConcepts.get(`${m.graph}|${m.to}`);
    links = mergeLinks(
      links, link(`gedge:${m.file}|${m.edge}`, 'arista de grafo', m.relation),
      conceptLinks(fromConcept, null, 'extremo de arista de grafo'),
      conceptLinks(toConcept, null, 'extremo de arista de grafo'),
    );
  }
  if (m.graph && m.nodes) links = mergeLinks(links, m.nodes.flatMap(n => conceptLinks(graphNodeConcepts.get(`${m.graph}|${n}`), null, 'campo de grafo')));
  if (m.definition) {
    const d = definitions.get(m.definition);
    if (d?.concepto) links = mergeLinks(links, conceptLinks(d.concepto, null, 'definición por etapas'));
    if (m.anchor?.startsWith('sub:')) links = mergeLinks(links, subunitLinks(m.anchor.slice(4)));
  }
  if (m.pillar) {
    const p = pillars.get(m.pillar);
    if (p?.faq) links = mergeLinks(links, faqLinks(p.faq));
  }
  if (item.source === 'profundizar') {
    const p = deepen.get(item.refId);
    links = mergeLinks(links, (p?.donde || []).flatMap(subunitLinks));
  }
  // Se anteponen para que el vínculo propio de la nota prevalezca sobre el heredado al fusionar.
  if (m.concepts) links = mergeLinks(m.concepts.flatMap(c => conceptLinks(c, null, 'concepto de nota')), links);
  if (item.source === 'faq') links = mergeLinks(links, faqLinks(m.faq || item.refId));
  if (m.destinationType && m.edge) links = mergeLinks(links, link(`fedge:${m.edge}`, 'arista de destino', m.destinationType));
  item.criteria = mergeLinks(links);
  item.contentHash = hash(JSON.stringify({
    source: item.source, kind: item.kind, title: item.title, text: item.text,
    language: item.language, voices: item.voices, ref: item.ref, refs: item.refs,
    bekker: item.bekker, url: item.url, meta: item.meta, criteria: item.criteria,
  }));
}

fragments.sort((a, b) => a.id.localeCompare(b.id, 'es'));
criterionCatalog.sort((a, b) => a.type.localeCompare(b.type) || a.label.localeCompare(b.label, 'es'));
const stats = {
  fragments: fragments.length,
  en1: fragments.filter(x => x.scopes.includes('en1')).length,
  structured: fragments.filter(x => x.voiceStatus === 'estructurada').length,
  unstructured: fragments.filter(x => x.voiceStatus !== 'estructurada').length,
  bySource: Object.fromEntries([...new Set(fragments.map(x => x.source))].sort().map(s => [s, fragments.filter(x => x.source === s).length])),
  byVoice: Object.fromEntries([...VOICES].map(v => [v, fragments.filter(x => x.voices.includes(v)).length])),
  criteria: {
    total: criterionCatalog.length,
    functional: criterionCatalog.filter(x => x.type === 'functional_category' || x.type === 'functional_node').length,
    staticConcepts: criterionCatalog.filter(x => x.type === 'static_concept').length,
    senses: criterionCatalog.filter(x => x.type === 'static_sense').length,
    functionalEdges: criterionCatalog.filter(x => x.type === 'functional_edge').length,
    graphEdges: criterionCatalog.filter(x => x.type === 'graph_edge').length,
  },
};
const corpus = {
  version: 'labo corpus v1.1',
  generated,
  sources: {
    tags: tags.version,
    static: estatico.version,
    functional: funcional.version,
    refsGenerated: refsIndex.generado,
    text: tags.texto_base,
  },
  policy: {
    defaultScope: 'en1',
    unstructuredInDossier: false,
    maxCriteria: 3,
    descendantsWeight: 0.68,
    note: 'Las fichas y aristas de grafos sin voz estructurada se buscan, pero no integran el dossier por defecto.',
  },
  stats,
  catalog: { version: 1, criteria: criterionCatalog },
  fragments,
};
corpus.contentHash = hash(JSON.stringify({ sources: corpus.sources, policy: corpus.policy, catalog: corpus.catalog, fragments }));

return corpus;
}
