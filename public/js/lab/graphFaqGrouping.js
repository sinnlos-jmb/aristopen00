// Grupos FAQ de presentación: el corpus conserva sus aristas reales y sus IDs.
// Un concepto se une a un agrupador; al expandir, los miembros salen DEL AGRUPADOR.
export const TIPOS_VISIBLES = Object.freeze([
  ['concepto_estatico', 'Conceptos estáticos'],
  ['nodo_funcional', 'Nodos funcionales propios'],
  ['faq', 'Preguntas FAQ'],
  ['unidad', 'Unidades'],
  ['definicion', 'Definiciones'],
]);

export function estadoTiposInicial() {
  return Object.fromEntries(TIPOS_VISIBLES.map(([tipo]) => [tipo, true]));
}

export function normalizarTiposVisibles(value) {
  const defaults = estadoTiposInicial();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  for (const key of Object.keys(defaults)) if (typeof value[key] === 'boolean') defaults[key] = value[key];
  return defaults;
}

export const idGrupoFaq = concepto => `grupo_faq:${concepto}`;

export function agruparFaqs(elementos, { expandidos = new Set(), tiposVisibles = estadoTiposInicial(), focos = [], nodosOcultos = [], conservados = [] } = {}) {
  const focus = new Set(focos);
  const ocultosManuales = new Set(nodosOcultos);
  const fijados = new Set(conservados);
  const visibles = normalizarTiposVisibles(tiposVisibles);
  const nodos = elementos.filter(el => el.group === 'nodes');
  const aristas = elementos.filter(el => el.group === 'edges');
  const byId = new Map(nodos.map(n => [n.data.id, n]));
  const ocultos = new Set(nodos.filter(n => !focus.has(n.data.id) && (visibles[n.data.tipo] === false || ocultosManuales.has(n.data.id))).map(n => n.data.id));
  const candidatas = new Map();
  for (const edge of aristas) {
    const d = edge.data;
    if (d.tipo !== 'foco_faq') continue;
    const faq = byId.get(d.source)?.data.tipo === 'faq' ? d.source : byId.get(d.target)?.data.tipo === 'faq' ? d.target : null;
    if (!faq || ocultos.has(faq) || focus.has(faq)) continue;
    const concepto = d.source === faq ? d.target : d.source;
    if (!byId.has(concepto) || ocultos.has(concepto)) continue;
    if (!candidatas.has(concepto)) candidatas.set(concepto, new Map());
    candidatas.get(concepto).set(d.id, { faq, edge });
  }
  const grupos = [];
  const sustituidas = new Set();
  const faqPlegadas = new Set();
  const addNodes = [], addEdges = [];
  const presentesPorGrupo = new Set();
  for (const [concepto, conexiones] of candidatas) {
    const miembros = [...new Set([...conexiones.values()].map(x => x.faq))].sort();
    if (miembros.length < 2) continue;
    const id = idGrupoFaq(concepto), abierto = expandidos.has(id);
    const escondido = ocultosManuales.has(id);
    grupos.push({ id, concepto, miembros, expandido: abierto });
    if (!escondido) addNodes.push({ group: 'nodes', data: { id, tipo: 'grupo_faq', label: `FAQ (${miembros.length})`,
      resumen: 1, agrupadorFaq: 1, concepto, cantidad: miembros.length, miembros: miembros.join(', ') } });
    if (!escondido) addEdges.push({ group: 'edges', data: { id: `enlace:${id}`, source: concepto, target: id,
      tipo: 'agrupacion_visual', fuente: 'presentacion', agrupacionVisual: 1, label: '', relacion: '' } });
    for (const [edgeId, { faq, edge }] of conexiones) {
      sustituidas.add(edgeId);
      if (escondido || (!abierto && !fijados.has(faq))) { faqPlegadas.add(faq); continue; }
      presentesPorGrupo.add(faq);
      // ID nuevo: una línea de presentación, con trazabilidad al vínculo original.
      addEdges.push({ group: 'edges', data: {
        id: `ramal_faq:${id}:${edgeId}`, source: id, target: faq,
        tipo: 'ramal_faq_visual', fuente: 'presentacion', agrupacionVisual: 1,
        aristaOriginalId: edgeId, relacionOriginal: edge.data.relacion || edge.data.tipo,
        referenciaOriginal: edge.data.referencia || '', label: '', relacion: '',
      } });
    }
  }
  // Las FAQ compartidas siguen visibles si hay otra relación no agrupada o un grupo abierto.
  const restantes = aristas.filter(e => !sustituidas.has(e.data.id) && !ocultos.has(e.data.source) && !ocultos.has(e.data.target));
  const conOtraConexion = new Set(restantes.flatMap(e => [e.data.source, e.data.target]));
  const quitadas = new Set([...faqPlegadas].filter(id => !presentesPorGrupo.has(id) && !conOtraConexion.has(id)));
  const outNodes = nodos.filter(n => !ocultos.has(n.data.id) && !quitadas.has(n.data.id));
  const ids = new Set([...outNodes, ...addNodes].map(n => n.data.id));
  const validEdges = [...restantes, ...addEdges].filter(e => ids.has(e.data.source) && ids.has(e.data.target));
  return { elementos: [...outNodes, ...addNodes, ...validEdges], grupos,
    ocultos: ocultos.size, agrupadas: quitadas.size };
}
