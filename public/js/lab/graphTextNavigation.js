// Checkpoint 9A: navegación textual de SOLO LECTURA.
// Un concepto clave, una relación editorial y un tag de párrafo NO acreditan lo mismo.
// Los nodos/aristas `texto_*` son presentación, no entidades ni aristas filosóficas.
const saneId = value => typeof value === 'string' && value.length > 0 && value.length <= 300;
const uniques = values => [...new Set(values)];
const asArray = value => Array.isArray(value) ? value : [];
const refBekker = sub => asArray(sub?.bekker).filter(Boolean).join('–');
const idsExtremo = text => typeof text === 'string' ? text.split(', ').filter(Boolean) : [];
const ID_LIMIT = 40;

export const estadoTextualInicial = () => ({ ancla: null, abierto: false, todasUnidades: false, unidadesAbiertas: [], unidadesCompletas: [] });
export function normalizarEstadoTextual(raw) {
  const base = estadoTextualInicial();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const a = raw.ancla;
  if (a && typeof a === 'object' && ['concepto', 'arista_funcional', 'faq'].includes(a.tipo)
    && saneId(a.id) && (a.tipo !== 'arista_funcional' ? saneId(a.nodo) : saneId(a.source) && saneId(a.target) && saneId(a.arista))) {
    base.ancla = a.tipo === 'arista_funcional'
      ? { tipo: a.tipo, id: a.id, arista: a.arista, source: a.source, target: a.target }
      : { tipo: a.tipo, id: a.id, nodo: a.nodo };
  }
  base.abierto = raw.abierto === true;
  base.todasUnidades = raw.todasUnidades === true;
  base.unidadesAbiertas = uniques(asArray(raw.unidadesAbiertas).filter(saneId)).slice(0, ID_LIMIT);
  base.unidadesCompletas = uniques(asArray(raw.unidadesCompletas).filter(saneId)).slice(0, ID_LIMIT);
  return base;
}

// Cada unidad puede provenir de una subunidad individual, o sólo de tags
// de párrafo. NO atribuimos a una subunidad los tags del párrafo de su unidad.
export function buscarVinculosTextuales(S = {}, ancla = null) {
  if (!ancla || !['concepto', 'arista_funcional', 'faq'].includes(ancla.tipo)) return [];
  const unidades = new Map();
  const ensuring = unitId => {
    const unit = S.U?.[unitId];
    if (!unit) return null;
    if (!unidades.has(unitId)) unidades.set(unitId, {
      id: unitId, titulo: unit.titulo || unitId, motivos: [], subunidades: new Map(),
    });
    return unidades.get(unitId);
  };
  const motivo = (unitId, subId, via, referencia = '') => {
    const u = ensuring(unitId);
    if (!u) return;
    const item = { via, referencia: String(referencia || '') };
    if (subId) {
      const sub = S.SUB?.[subId];
      if (!sub || sub.unidad !== unitId) return;
      if (!u.subunidades.has(subId)) u.subunidades.set(subId, {
        id: subId, titulo: sub.titulo || subId, bekker: refBekker(sub), motivos: [],
      });
      const s = u.subunidades.get(subId);
      if (!s.motivos.some(m => m.via === via && m.referencia === item.referencia)) s.motivos.push(item);
    }
    if (!u.motivos.some(m => m.via === via && m.referencia === item.referencia)) u.motivos.push(item);
  };

  for (const [subId, sub] of Object.entries(S.SUB || {})) {
    if (!sub?.unidad) continue;
    if (ancla.tipo === 'concepto') {
      if (asArray(sub.conceptos_clave).includes(ancla.id))
        motivo(sub.unidad, subId, 'concepto_clave', refBekker(sub));
      // Sólo extremos que se corresponden exactamente con IDs; no texto libre.
      for (const r of asArray(sub.relaciones)) if ([...idsExtremo(r.de), ...idsExtremo(r.a)].includes(ancla.id))
        motivo(sub.unidad, subId, 'extremo_relacion_editorial', r.ref || refBekker(sub));
    }
    if (ancla.tipo === 'arista_funcional') {
      for (const r of asArray(sub.relaciones)) for (const d of asArray(r.destinos))
        if (d.arista === ancla.id)
          motivo(sub.unidad, subId, 'destino_arista_funcional', d.ref || r.ref || refBekker(sub));
    }
  }
  if (ancla.tipo === 'concepto') {
    for (const [unitId, unit] of Object.entries(S.U || {})) {
      for (const p of asArray(unit.parrafos)) {
        if (asArray(S.TP?.[p]?.conceptos).some(t => t.c === ancla.id)) {
          motivo(unitId, null, 'tag_parrafo_contexto_unidad', `Párrafo ${p}`);
        }
      }
    }
  }
  if (ancla.tipo === 'faq') {
    const faq = S.FAQ?.[ancla.id];
    for (const pasaje of asArray(faq?.pasajes)) {
      const ref = pasaje?.ref;
      if (typeof ref !== 'string') continue;
      // Se prueban explícitamente IDs de unidad (u:) y subunidad (sub: o exactos).
      const unitId = ref.startsWith('u:') ? ref.slice(2) : null;
      if (unitId && S.U?.[unitId]) motivo(unitId, null, 'pasaje_faq_unidad', ref);
      const subId = ref.startsWith('sub:') ? ref.slice(4) : ref;
      const sub = S.SUB?.[subId];
      if (sub) motivo(sub.unidad, subId, 'pasaje_faq_subunidad', ref);
    }
  }
  const pesos = { destino_arista_funcional: 1, extremo_relacion_editorial: 2, concepto_clave: 3,
    pasaje_faq_subunidad: 3, pasaje_faq_unidad: 4, tag_parrafo_contexto_unidad: 8 };
  return [...unidades.values()].map(u => ({ ...u,
    subunidades: [...u.subunidades.values()].sort((a,b) => a.id.localeCompare(b.id, 'es')),
    todasSubunidades: asArray(S.U?.[u.id]?.subunidades).map(sub => ({ id: sub.id, titulo: sub.titulo || sub.id, bekker: refBekker(sub), motivos: [{ via: 'contexto_unidad_no_evidencia_directa', referencia: '' }] })),
    prioridad: Math.min(...u.motivos.map(m => pesos[m.via] || 9)),
  })).sort((a,b) => a.prioridad - b.prioridad || a.titulo.localeCompare(b.titulo, 'es'));
}

export const idHubTexto = ancla => `texto:hub:${ancla.tipo}:${ancla.id}`;
export const idUnidadTexto = id => `texto:unidad:${id}`;
export const idSubunidadTexto = id => `texto:subunidad:${id}`;

// Consume un subgrafo ya filtrado. La capa no añade nada al índice conceptual.
export function construirCapaTextual(elementos, unidades, rawState) {
  const state = normalizarEstadoTextual(rawState);
  const a = state.ancla;
  const base = elementos.filter(e => e.group === 'nodes');
  const ids = new Set(base.map(e => e.data.id));
  if (!a || !unidades.length) return { elementos, visible: false, unidadesVisibles: 0, subunidadesVisibles: 0 };
  if (a.tipo === 'arista_funcional') {
    const edge = elementos.find(e => e.group === 'edges' && e.data.id === a.arista);
    if (!edge || edge.data.source !== a.source || edge.data.target !== a.target) return { elementos, visible: false, unidadesVisibles: 0, subunidadesVisibles: 0 };
  } else if (!ids.has(a.nodo)) return { elementos, visible: false, unidadesVisibles: 0, subunidadesVisibles: 0 };
  const nodes = [], edges = [];
  const node = (id, label, data = {}) => { if (ids.has(id)) return; ids.add(id); nodes.push({ group: 'nodes', data: { id, label, tipo: 'texto_navegacion', navegacionTextual: 1, ...data } }); };
  const edge = (id, from, to) => edges.push({ group: 'edges', data: { id, source: from, target: to,
    tipo: 'navegacion_textual_visual', fuente: 'presentacion', agrupacionVisual: 1, navegacionTextual: 1,
    nombreAristaVisible: '' } });
  let origen = a.nodo;
  if (a.tipo === 'arista_funcional') {
    origen = `texto:relacion:${a.id}`;
    node(origen, 'Evidencia de relación', { anclaRelacion: 1, idRelacion: a.id });
    edge(`texto:desde:${a.arista}`, a.source, origen);
    edge(`texto:hacia:${a.arista}`, a.target, origen);
  }
  const hub = idHubTexto(a);
  node(hub, `Texto de Aristóteles (${unidades.length})`, { grupoTexto: 1 });
  edge(`texto:enlace:${hub}`, origen, hub);
  let countUnits = 0, countSubs = 0;
  if (state.abierto) {
    const mostradas = state.todasUnidades ? unidades : unidades.slice(0, 6);
    for (const u of mostradas) {
      const id = idUnidadTexto(u.id);
      node(id, u.titulo, { unidadTexto: 1, unidadId: u.id, nivelEvidencia: u.prioridad });
      edge(`texto:enlace:unidad:${hub}:${u.id}`, hub, id);
      countUnits++;
      if (!state.unidadesAbiertas.includes(u.id)) continue;
      const subs = state.unidadesCompletas.includes(u.id)
        ? u.todasSubunidades : u.subunidades;
      for (const sub of subs) {
        const sid = idSubunidadTexto(sub.id);
        node(sid, sub.titulo, { subunidadTexto: 1, subunidadId: sub.id, unidadId: u.id, referencia: sub.bekker });
        edge(`texto:enlace:sub:${u.id}:${sub.id}`, id, sid);
        countSubs++;
      }
    }
  }
  return { elementos: [...elementos, ...nodes, ...edges], visible: true, unidadesVisibles: countUnits, subunidadesVisibles: countSubs };
}

// El modo «todas las subunidades» se aplica exclusivamente a una unidad abierta,
// nunca se confunde con pertinencia documental.
export function subunidadesParaUnidad(S, unitId, vinculadas = [], completas = false) {
  if (!completas) return vinculadas;
  const unit = S.U?.[unitId];
  return asArray(unit?.subunidades).map(s => ({ id: s.id, titulo: s.titulo || s.id,
    bekker: refBekker(s), motivos: [{ via: 'contexto_unidad_no_evidencia_directa', referencia: '' }] }));
}
