// Proyección experimental, de sólo lectura, del contenido editorial de Ágora.
// Una conexión en esta proyección expresa la procedencia indicada, NO una
// equivalencia filosófica ni una inferencia textual automática.
export const SEMANTIC_PROJECTION_VERSION = 1;

const txt = v => v == null ? '' : String(v);
const norm = v => txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const uid = (clase, id) => `${clase}:${txt(id)}`;

export function buildSemanticProjection(S = {}) {
  const nodes = [];
  const edges = [];
  const issues = [];
  const byUid = new Map();

  function node(tipo, id, etiqueta, fuente, extra = {}) {
    if (id === null || id === undefined || id === '') return;
    const key = uid(tipo, id);
    if (byUid.has(key)) {
      issues.push({ tipo: 'nodo_duplicado', uid: key, fuente });
      return;
    }
    const n = {
      uid: key, id: txt(id), tipo, etiqueta: txt(etiqueta || id), fuente,
      griego: txt(extra.griego), referencia: txt(extra.referencia), voz: txt(extra.voz),
    };
    byUid.set(key, n); nodes.push(n);
  }
  function edge(tipo, from, to, fuente, extra = {}) {
    if (!byUid.has(from) || !byUid.has(to)) {
      issues.push({ tipo: 'extremo_no_resuelto', relacion: tipo, desde: from, hacia: to, fuente });
      return;
    }
    edges.push({
      uid: `vinculo:${edges.length + 1}`, tipo, desde: from, hacia: to, fuente,
      relacion: txt(extra.relacion), referencia: txt(extra.referencia),
      voz: txt(extra.voz), sentidoReferido: txt(extra.sentidoReferido),
      rol: txt(extra.rol), idFuente: txt(extra.idFuente),
    });
  }
  function conceptoId(id) {
    if (byUid.has(uid('concepto_estatico', id))) return uid('concepto_estatico', id);
    if (byUid.has(uid('nodo_funcional', id))) return uid('nodo_funcional', id);
    return null;
  }

  // Identidades separadas: el mismo ID en los dos grafos NO fusiona nodos.
  for (const [id, n] of Object.entries(S.N || {}))
    node('concepto_estatico', id, n.label, 'estatico', { griego: n.gr });
  for (const [id, n] of Object.entries(S.FN || {}))
    node('nodo_funcional', id, n.label, 'funcional', { griego: n.gr });
  for (const [id, u] of Object.entries(S.U || {}))
    node('unidad', id, u.titulo, 'tags.unidades');
  for (const [id, sub] of Object.entries(S.SUB || {}))
    node('subunidad', id, sub.titulo, 'tags.unidades.subunidades', {
      referencia: Array.isArray(sub.bekker) ? sub.bekker.join('–') : sub.bekker,
    });
  for (const [id, p] of Object.entries(S.TP || {}))
    node('parrafo', id, `Párrafo ${id}`, 'tags.parrafos');
  for (const [id, faq] of Object.entries(S.FAQ || {}))
    node('faq', id, faq.pregunta, 'tags.faqs');
  for (const [id, d] of Object.entries(S.DEF || {}))
    node('definicion', id, d.titulo || id, 'tags.definiciones', { referencia: d.referencia?.ref });

  // Estructuras jerárquicas: hijo -> padre; nunca presupone causalidad.
  for (const [id, n] of Object.entries(S.N || {})) {
    const ancestors = n.path;
    if (Array.isArray(ancestors) && ancestors.length) {
      edge('jerarquia_estatica', uid('concepto_estatico', id),
        uid('concepto_estatico', ancestors.at(-1)), 'estatico.raices.hijos');
    }
  }
  const traverseFN = (n, parentId = null) => {
    if (!n?.id) return;
    if (parentId) edge('jerarquia_funcional', uid('nodo_funcional', n.id),
      uid('nodo_funcional', parentId), 'funcional.categorias.hijos');
    for (const child of n.hijos || []) traverseFN(child, n.id);
  };
  for (const root of S.ftree?.categorias || []) traverseFN(root);

  for (const e of S.FE || []) {
    edge('arista_funcional', uid('nodo_funcional', e.de), uid('nodo_funcional', e.a),
      'funcional.aristas', { relacion: e.rel, referencia: e.ref, voz: e.voz, idFuente: e.id });
  }
  for (const [id, n] of Object.entries(S.FN || {})) {
    for (const remision of n.remite_a || []) {
      const [base, ...partes] = txt(remision).split('#');
      edge('remision_editorial', uid('nodo_funcional', id), uid('concepto_estatico', base),
        'funcional.remite_a', { sentidoReferido: partes.join('#') });
    }
  }

  // Tag de subunidad: asociación editorial, NO prueba de contenido puntual.
  for (const [id, sub] of Object.entries(S.SUB || {})) {
    if (sub.unidad) edge('pertenece_unidad', uid('subunidad', id), uid('unidad', sub.unidad),
      'tags.unidades.subunidades');
    for (const concept of sub.conceptos_clave || []) {
      const target = conceptoId(concept);
      edge('tag_subunidad', uid('subunidad', id), target || uid('concepto_no_identificado', concept),
        'tags.subunidades.conceptos_clave');
    }
  }
  // Un tag de párrafo tiene su propia granularidad; no es evidencia de subunidad.
  for (const [id, p] of Object.entries(S.TP || {})) {
    for (const c of p.conceptos || []) {
      if (!c?.c) continue;
      const target = conceptoId(c.c);
      edge('tag_parrafo', uid('parrafo', id), target || uid('concepto_no_identificado', c.c),
        'tags.parrafos.conceptos', { sentidoReferido: c.s || '', rol: c.n || '' });
    }
  }
  for (const [id, d] of Object.entries(S.DEF || {})) {
    if (!d.concepto) continue;
    const target = conceptoId(d.concepto);
    edge('definicion_de', uid('definicion', id), target || uid('concepto_no_identificado', d.concepto),
      'tags.definiciones.concepto', { referencia: d.referencia?.ref });
  }
  for (const [id, faq] of Object.entries(S.FAQ || {})) {
    if (faq.arbol?.nodo) {
      const target = conceptoId(faq.arbol.nodo);
      edge('foco_faq', uid('faq', id), target || uid('concepto_no_identificado', faq.arbol.nodo),
        'tags.faqs.arbol.nodo');
    }
    for (const pasaje of faq.pasajes || []) {
      if (!pasaje?.ref) continue;
      // Sólo resolvemos referencias que sean IDs de subunidad exactos.
      // Un rango Bekker diferente no se equipara automáticamente a un ID.
      edge('pasaje_faq', uid('faq', id), uid('subunidad', pasaje.ref),
        'tags.faqs.pasajes', { rol: pasaje.rol });
    }
  }
  const porTipo = {}, porRelacion = {};
  for (const n of nodes) porTipo[n.tipo] = (porTipo[n.tipo] || 0) + 1;
  for (const e of edges) porRelacion[e.tipo] = (porRelacion[e.tipo] || 0) + 1;
  return {
    version: SEMANTIC_PROJECTION_VERSION,
    fuente: 'proyeccion_local_sin_mutaciones',
    versionCorpus: txt(S.tags?.version || 'sin_version'),
    nodes, edges, issues,
    stats: { nodos: nodes.length, aristas: edges.length, incidencias: issues.length, porTipo, porRelacion },
  };
}

export function buscarNodosSemanticos(graph, texto, limit = 18) {
  const query = norm(texto);
  if (!query) return [];
  const score = n => {
    const fields = [n.id, n.etiqueta, n.griego];
    return fields.some(s => norm(s) === query) ? 3
      : fields.some(s => norm(s).startsWith(query)) ? 2
      : fields.some(s => norm(s).includes(query)) ? 1 : 0;
  };
  return (graph?.nodes || []).filter(n => score(n) > 0)
    .sort((a, b) => score(b) - score(a) || a.etiqueta.localeCompare(b.etiqueta, 'es'))
    .slice(0, Math.max(0, Math.min(40, Number(limit) || 18)));
}

export function explorarVecindad(graph, foco, { saltos = 1, maxNodos = 35, maxAristas = 90 } = {}) {
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];
  const index = new Map(nodes.map(n => [n.uid, n]));
  if (!index.has(foco)) return { foco, nodos: [], aristas: [], truncado: false, error: 'Nodo inexistente' };
  const adjacency = new Map();
  for (const e of edges) {
    if (!adjacency.has(e.desde)) adjacency.set(e.desde, []);
    if (!adjacency.has(e.hacia)) adjacency.set(e.hacia, []);
    adjacency.get(e.desde).push(e);
    adjacency.get(e.hacia).push(e);
  }
  const depthLimit = Math.max(1, Math.min(2, Number(saltos) || 1));
  const visited = new Map([[foco, 0]]);
  const chosen = new Map();
  const queue = [foco];
  let truncated = false;
  while (queue.length) {
    const current = queue.shift();
    if (visited.get(current) >= depthLimit) continue;
    for (const e of adjacency.get(current) || []) {
      const other = e.desde === current ? e.hacia : e.desde;
      if (!visited.has(other)) {
        if (visited.size >= maxNodos) { truncated = true; continue; }
        visited.set(other, visited.get(current) + 1);
        queue.push(other);
      }
      if (visited.has(other) && !chosen.has(e.uid)) {
        if (chosen.size >= maxAristas) { truncated = true; continue; }
        chosen.set(e.uid, e);
      }
    }
  }
  return {
    foco, nodos: [...visited].map(([id, profundidad]) => ({ ...index.get(id), profundidad })),
    aristas: [...chosen.values()], truncado: truncated, error: null,
    advertencia: 'La vecindad atraviesa conexiones en ambas direcciones sólo para explorar; las aristas conservan dirección y procedencia.',
  };
}

// Cypher de importación idempotente: no DROP, no inferencia, UIDs separados.
// Producimos literales de strings JSON (válidos como literales Cypher dobles).
export function exportarRelateCypher(graph, batchSize = 75) {
  const atom = value => JSON.stringify(txt(value));
  const nodeMap = n => `{uid: ${atom(n.uid)}, id: ${atom(n.id)}, tipo: ${atom(n.tipo)}, etiqueta: ${atom(n.etiqueta)}, fuente: ${atom(n.fuente)}, griego: ${atom(n.griego)}, referencia: ${atom(n.referencia)}, voz: ${atom(n.voz)}}`;
  const edgeMap = e => `{uid: ${atom(e.uid)}, tipo: ${atom(e.tipo)}, desde: ${atom(e.desde)}, hacia: ${atom(e.hacia)}, fuente: ${atom(e.fuente)}, relacion: ${atom(e.relacion)}, referencia: ${atom(e.referencia)}, voz: ${atom(e.voz)}, sentidoReferido: ${atom(e.sentidoReferido)}, rol: ${atom(e.rol)}}`;
  const statements = [
    '// Ágora — proyección experimental de lectura. Generada desde /api/contenido.',
    '// No sustituye MariaDB. No se crean relaciones filosóficas por inferencia.',
    `// Corpus ${graph.versionCorpus} — ${graph.nodes.length} nodos / ${graph.edges.length} aristas.`,
  ];
  const batch = Math.max(1, Math.min(200, Number(batchSize) || 75));
  for (let i = 0; i < graph.nodes.length; i += batch) {
    statements.push(`UNWIND [\n  ${graph.nodes.slice(i, i + batch).map(nodeMap).join(',\n  ')}\n] AS fila\nMERGE (n:AgoraNodo {uid: fila.uid})\nSET n.id = fila.id, n.tipo = fila.tipo, n.etiqueta = fila.etiqueta, n.fuente = fila.fuente, n.griego = fila.griego, n.referencia = fila.referencia, n.voz = fila.voz;`);
  }
  for (let i = 0; i < graph.edges.length; i += batch) {
    statements.push(`UNWIND [\n  ${graph.edges.slice(i, i + batch).map(edgeMap).join(',\n  ')}\n] AS fila\nMATCH (a:AgoraNodo {uid: fila.desde}), (b:AgoraNodo {uid: fila.hacia})\nMERGE (a)-[r:AGORA_VINCULO {uid: fila.uid}]->(b)\nSET r.tipo = fila.tipo, r.fuente = fila.fuente, r.relacion = fila.relacion, r.referencia = fila.referencia, r.voz = fila.voz, r.sentidoReferido = fila.sentidoReferido, r.rol = fila.rol;`);
  }
  return statements.join('\n\n') + '\n';
}

// Puente previsto con el Orientador: candidatos DESCRIPTIVOS, no preferencias
// del estudiante ni afirmaciones de una relación filosófica validada.
// Cada candidato lleva un testigo de hasta 2 vínculos reales, con dirección.
export function sugerirConceptosSemanticos(graph, foco, limit = 8) {
  const nodes = new Map((graph?.nodes || []).map(n => [n.uid, n]));
  if (!nodes.has(foco)) return [];
  const adjacency = new Map();
  const add = (k, e) => { if (!adjacency.has(k)) adjacency.set(k, []); adjacency.get(k).push(e); };
  for (const e of graph.edges || []) { add(e.desde, e); add(e.hacia, e); }
  const nodoInicial = nodes.get(foco);
  const candidatePaths = new Map();
  const relCost = e => ({
    arista_funcional: 1, remision_editorial: 2,
    jerarquia_funcional: 3, jerarquia_estatica: 3,
    definicion_de: 5, foco_faq: 5, pasaje_faq: 6,
    tag_subunidad: 8, tag_parrafo: 9, pertenece_unidad: 10,
  })[e.tipo] || 10;
  const step = (e, from) => ({
    desde: e.desde, hacia: e.hacia, tipo: e.tipo,
    fuente: e.fuente, referencia: e.referencia, voz: e.voz,
    recorridoEnSentidoOriginal: e.desde === from,
  });
  const offer = (targetUid, path, score) => {
    const target = nodes.get(targetUid);
    if (!target || !['concepto_estatico', 'nodo_funcional'].includes(target.tipo)) return;
    // Una remisión entre dos representaciones del mismo concepto no es una
    // sugerencia para cambiar de tema: pertenece a la identificación de sentidos.
    if (target.id === nodoInicial.id) return;
    const prev = candidatePaths.get(targetUid);
    if (!prev || score < prev.puntuacionDeOrden) candidatePaths.set(targetUid, {
      uid: targetUid, id: target.id, etiqueta: target.etiqueta, tipo: target.tipo,
      recorrido: path, puntuacionDeOrden: score,
      estado: 'candidato_para_explorar_no_relacion_validada',
      base: path.some(e => e.tipo.startsWith('tag_')) ? 'asociacion_por_tags' : 'estructura_documental',
    });
  };
  for (const e1 of adjacency.get(foco) || []) {
    const middle = e1.desde === foco ? e1.hacia : e1.desde;
    offer(middle, [step(e1, foco)], relCost(e1));
    for (const e2 of adjacency.get(middle) || []) {
      const target = e2.desde === middle ? e2.hacia : e2.desde;
      if (target === foco || e1.uid === e2.uid) continue;
      offer(target, [step(e1, foco), step(e2, middle)], 20 + relCost(e1) + relCost(e2));
    }
  }
  return [...candidatePaths.values()]
    .sort((a, b) => a.puntuacionDeOrden - b.puntuacionDeOrden || a.etiqueta.localeCompare(b.etiqueta, 'es'))
    .slice(0, Math.max(0, Math.min(20, Number(limit) || 8)));
}
