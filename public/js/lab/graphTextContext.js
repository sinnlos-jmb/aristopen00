// Grafo documental contextual (9A.2): identidad editorial intacta, agrupadores visuales.
// Las flechas de orden representan continuidad textual, NO relaciones filosóficas.
import { idUnidadTexto, idSubunidadTexto } from './graphTextNavigation.js';

const array = x => Array.isArray(x) ? x : [];
const uniqueIds = x => [...new Set(array(x).filter(id => typeof id === 'string' && id.length > 0 && id.length <= 300))].slice(0, 100);
const validPosition = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= 1e7 && Math.abs(p.y) <= 1e7;
const MAX_CONTEXTOS = 32, MAX_POSICIONES = 250, MAX_GRUPOS = 12;
const clean = x => typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 90) : '';

export function claveContextoTextual(ancla) {
  if (!ancla || !['concepto', 'faq', 'arista_funcional'].includes(ancla.tipo)
    || typeof ancla.id !== 'string' || !ancla.id || ancla.id.length > 300) return null;
  return `${ancla.tipo}:${ancla.id}`;
}

export const estadoContextoInicial = () => ({ todasUnidades: false, unidadesAbiertas: [], unidadesCompletas: [], posiciones: {},
  grupos: [], gruposAbiertos: [], seleccionGrupo: [] });
export function normalizarEstadoContexto(raw) {
  const state = estadoContextoInicial();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return state;
  state.todasUnidades = raw.todasUnidades === true;
  state.unidadesAbiertas = uniqueIds(raw.unidadesAbiertas);
  state.unidadesCompletas = uniqueIds(raw.unidadesCompletas);
  state.seleccionGrupo = uniqueIds(raw.seleccionGrupo);
  if (raw.posiciones && typeof raw.posiciones === 'object' && !Array.isArray(raw.posiciones)) {
    state.posiciones = Object.fromEntries(Object.entries(raw.posiciones)
      .filter(([id, p]) => typeof id === 'string' && id.length <= 300 && validPosition(p))
      .slice(0, MAX_POSICIONES).map(([id, p]) => [id, { x: p.x, y: p.y }]));
  }
  const used = new Set();
  state.grupos = array(raw.grupos).filter(g => g && typeof g === 'object' && !Array.isArray(g))
    .map(g => ({ id: clean(g.id), titulo: clean(g.titulo), miembros: uniqueIds(g.miembros) }))
    .filter(g => g.id && /^[a-zA-Z0-9_-]+$/.test(g.id) && g.titulo && g.miembros.length && !used.has(g.id) && (used.add(g.id), true))
    .slice(0, MAX_GRUPOS);
  state.gruposAbiertos = uniqueIds(raw.gruposAbiertos).filter(id => state.grupos.some(g => g.id === id));
  return state;
}

export function normalizarContextosTexto(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw)
    .filter(([key]) => typeof key === 'string' && key.length <= 320 && /^(concepto|faq|arista_funcional):.+/.test(key))
    .slice(0, MAX_CONTEXTOS)
    .map(([key, state]) => [key, normalizarEstadoContexto(state)]));
}

export const idAnclaContextual = ancla => `texto:contexto:${claveContextoTextual(ancla)}`;
export const idGrupoTexto = id => `texto:grupo:${id}`;

export function crearGrupoTexto(rawState, titulo, miembros) {
  const state = normalizarEstadoContexto(rawState);
  const nombre = clean(titulo);
  const ids = uniqueIds(miembros);
  if (!nombre || !ids.length || state.grupos.length >= MAX_GRUPOS) return null;
  const taken = new Set(state.grupos.flatMap(g => g.miembros));
  const libres = ids.filter(id => !taken.has(id) && (id.startsWith('texto:unidad:') || id.startsWith('texto:subunidad:')));
  if (!libres.length) return null;
  const n = Math.max(0, ...state.grupos.map(g => Number(g.id.slice(1)) || 0)) + 1;
  const id = `g${n}`;
  return normalizarEstadoContexto({ ...state, grupos: [...state.grupos, { id, titulo: nombre, miembros: libres }],
    seleccionGrupo: [], gruposAbiertos: state.gruposAbiertos.filter(x => x !== id) });
}

// Orden textual opcional, extraído de la secuencia explícita tags.unidades/subunidades.
// No conectar unidades que son solo vecinas en la selección, sino sucesivas en el corpus.
export function ordenTextualDe(S = {}) {
  const ordenUnidades = array(S.tags?.unidades).map(u => u.id);
  const ordenSubs = Object.fromEntries(array(S.tags?.unidades).map(u => [u.id, array(u.subunidades).map(s => s.id)]));
  return { ordenUnidades, ordenSubs };
}

export function construirGrafoContextual(ancla, titulo, unidades, rawState, opciones = {}) {
  const key = claveContextoTextual(ancla);
  const state = normalizarEstadoContexto(rawState);
  if (!key) return { elementos: [], posicionesSugeridas: {}, unidadesVisibles: 0, subunidadesVisibles: 0 };
  const list = state.todasUnidades ? array(unidades) : array(unidades).slice(0, 6);
  const root = idAnclaContextual(ancla);
  const elementos = [{ group: 'nodes', data: { id: root, label: String(titulo || ancla.id),
    tipo: 'texto_ancla', foco: 1, anclaContextual: 1 } }];
  const posicionesSugeridas = { [root]: { x: 0, y: 0 } };
  const edges = [];
  const addEdge = (id, source, target, nombre, extra = {}) => edges.push({ group: 'edges', data: {
    id, source, target, tipo: 'navegacion_textual_visual', navegacionTextual: 1,
    fuente: 'presentacion', nombreAristaVisible: nombre, relacion: nombre,
    relacionDocumental: 0, ...extra } });
  const unidadIds = new Set(list.map(u => u.id));
  const nodosTexto = new Map();
  const nombresVinculo = {
    destino_arista_funcional: 'documenta arista',
    extremo_relacion_editorial: 'relación editorial',
    concepto_clave: 'concepto clave',
    pasaje_faq_subunidad: 'FAQ cita subunidad',
    pasaje_faq_unidad: 'FAQ cita unidad',
    tag_parrafo_contexto_unidad: 'tag de párrafo',
  };
  let subCount = 0;
  for (const [i, u] of list.entries()) {
    const id = idUnidadTexto(u.id);
    nodosTexto.set(id, { group: 'nodes', data: { id, label: u.titulo, tipo: 'texto_navegacion',
      navegacionTextual: 1, unidadTexto: 1, unidadId: u.id } });
    const mejorMotivo = array(u.motivos).find(m => nombresVinculo[m.via]);
    const nombreVinculo = nombresVinculo[mejorMotivo?.via] || 'vínculo documental';
    addEdge(`texto:contexto:unidad:${key}:${u.id}`, root, id, nombreVinculo,
      { agrupacionVisual: 1, via: mejorMotivo?.via || '' });
    const angle = -Math.PI / 2 + 2 * Math.PI * i / Math.max(1, list.length);
    const radius = list.length < 4 ? 200 : 260;
    posicionesSugeridas[id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    if (!state.unidadesAbiertas.includes(u.id)) continue;
    const vinculadas = new Map(array(u.subunidades).map(s => [s.id, s]));
    const subs = state.unidadesCompletas.includes(u.id)
      ? array(u.todasSubunidades).map(s => vinculadas.get(s.id) || s)
      : array(u.subunidades);
    for (const sub of subs) {
      const sid = idSubunidadTexto(sub.id);
      nodosTexto.set(sid, { group: 'nodes', data: { id: sid, label: sub.titulo, tipo: 'texto_navegacion',
        navegacionTextual: 1, subunidadTexto: 1, subunidadId: sub.id, unidadId: u.id,
        referencia: sub.bekker, vinculada: vinculadas.has(sub.id) ? 1 : 0 } });
      addEdge(`texto:contexto:sub:${key}:${u.id}:${sub.id}`, id, sid, 'contiene', { pertenenciaTextual: 1 });
      subCount++;
    }
  }
  // Conexiones de secuencia únicamente cuando ambos elementos son consecutivos EN EL CORPUS.
  const unitOrder = array(opciones.ordenUnidades);
  for (let i = 1; i < unitOrder.length; i++) {
    const prev = unitOrder[i - 1], next = unitOrder[i];
    if (unidadIds.has(prev) && unidadIds.has(next)) addEdge(`texto:orden:unidad:${prev}:${next}`,
      idUnidadTexto(prev), idUnidadTexto(next), 'sigue en texto', { ordenTextual: 1 });
  }
  for (const u of list) {
    const seq = array(opciones.ordenSubs?.[u.id]);
    for (let i = 1; i < seq.length; i++) {
      const a = idSubunidadTexto(seq[i - 1]), b = idSubunidadTexto(seq[i]);
      if (nodosTexto.has(a) && nodosTexto.has(b)) addEdge(`texto:orden:sub:${u.id}:${seq[i - 1]}:${seq[i]}`,
        a, b, 'continúa', { ordenTextual: 1 });
    }
  }
  // Los agrupadores sustituyen visualmente miembros contraídos y restauran relaciones al abrirse.
  const gruposVisibles = [];
  const sustituciones = new Map();
  for (const g of state.grupos) {
    const presentes = g.miembros.filter(id => nodosTexto.has(id));
    if (!presentes.length) continue;
    const gid = idGrupoTexto(g.id);
    gruposVisibles.push({ group: 'nodes', data: { id: gid, label: `${g.titulo} (${presentes.length})`,
      tipo: 'grupo_textual_usuario', grupoUsuario: 1, grupoId: g.id, navegacionTextual: 1 } });
    const coords = presentes.map(id => posicionesSugeridas[id]).filter(Boolean);
    posicionesSugeridas[gid] = coords.length ? { x: coords.reduce((n,p) => n + p.x,0)/coords.length,
      y: coords.reduce((n,p) => n + p.y,0)/coords.length } : { x: 160, y: -120 };
    if (!state.gruposAbiertos.includes(g.id)) {
      presentes.forEach(id => sustituciones.set(id, gid));
      // Contraer una unidad incluye sus subunidades, sin borrar las relaciones originales.
      for (const id of presentes.filter(id => id.startsWith('texto:unidad:'))) {
        for (const n of nodosTexto.values()) if (n.data.subunidadTexto && id === idUnidadTexto(n.data.unidadId))
          sustituciones.set(n.data.id, gid);
      }
    }
  }
  const visibles = [...nodosTexto.values()].filter(n => !sustituciones.has(n.data.id));
  elementos.push(...visibles, ...gruposVisibles);
  const visibleIds = new Set(elementos.map(e => e.data.id));
  const rendered = new Map();
  for (const e of edges) {
    const d = e.data;
    const source = sustituciones.get(d.source) || d.source;
    const target = sustituciones.get(d.target) || d.target;
    if (source === target || !visibleIds.has(source) || !visibleIds.has(target)) continue;
    const keyEdge = `${source}|${target}|${d.ordenTextual ? 'orden' : 'navegacion'}`;
    if (rendered.has(keyEdge)) continue;
    rendered.set(keyEdge, { group: 'edges', data: { ...d, id: source === d.source && target === d.target ? d.id : `texto:agrupada:${key}:${rendered.size}`,
      source, target, nombreAristaVisible: source === d.source && target === d.target ? d.nombreAristaVisible : 'agrupa',
      agrupacionVisual: source !== d.source || target !== d.target ? 1 : d.agrupacionVisual || 0 } });
  }
  // Para que cada agrupador aislado permanezca alcanzable desde el foco contextual.
  for (const g of gruposVisibles) if (![...rendered.values()].some(e => e.data.source === g.data.id || e.data.target === g.data.id))
    addEdge(`texto:grupo:enlace:${key}:${g.data.grupoId}`, root, g.data.id, 'agrupa', { agrupacionVisual: 1 });
  elementos.push(...rendered.values(), ...edges.filter(e => e.data.id.startsWith('texto:grupo:enlace:')));
  // Focos restantes únicamente orientativos: identidad y dirección de las aristas originales conservadas.
  const focoIds = [...new Set(array(opciones.focos).filter(id => typeof id === 'string'))].slice(0, 5);
  const orientados = new Map();
  for (const [i, fid] of focoIds.entries()) {
    const nid = `texto:orientativo:${fid}`;
    const nombre = opciones.etiquetasFoco?.[fid] || fid.split(':').pop();
    elementos.push({ group: 'nodes', data: { id: nid, label: nombre, tipo: 'foco_orientativo',
      orientativo: 1, navegacionTextual: 1, focoActivoOrientativo: fid === ancla.nodo ? 1 : 0 } });
    orientados.set(fid, nid);
    posicionesSugeridas[nid] = { x: (i - (focoIds.length - 1)/2) * 175, y: -470 };
  }
  for (const edge of array(opciones.aristasFoco)) {
    const d = edge.data || edge;
    if (!orientados.has(d.source) || !orientados.has(d.target)) continue;
    elementos.push({ group: 'edges', data: { id: `texto:orientativo:arista:${d.id}`,
      source: orientados.get(d.source), target: orientados.get(d.target), tipo: 'arista_focal_orientativa',
      orientativo: 1, relacion: d.relacion || d.label || '', fuente: d.fuente || 'corpus',
      nombreAristaVisible: d.relacion || d.label || '', relacionDocumental: 1 } });
  }
  return { elementos, posicionesSugeridas, unidadesVisibles: list.length, subunidadesVisibles: subCount,
    gruposVisibles: gruposVisibles.length };
}
