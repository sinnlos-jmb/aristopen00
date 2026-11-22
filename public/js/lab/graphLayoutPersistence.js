// Preferencias de visualización por conjunto de focos; jamás modifica el corpus.
export const GRAPH_LAYOUT_STORAGE_KEY = 'agora.lab.visorgrafos.layouts.v1';
const MAX_ENTRIES = 30;
import { estadoTiposInicial, normalizarTiposVisibles } from './graphFaqGrouping.js';
import { normalizarIds } from './graphNodeVisibility.js';
import { normalizarEstadoTextual } from './graphTextNavigation.js';
import { normalizarContextosTexto } from './graphTextContext.js';
export const MAX_TITULO_ARISTA = 100;
const MAX_TITULOS_POR_DISPOSICION = 250;

// Los títulos son alias de presentación: NO reemplazan `relacion`, `tipo` ni la evidencia.
export function normalizarTituloArista(titulo) {
  if (typeof titulo !== 'string') return '';
  return titulo.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim()
    .slice(0, MAX_TITULO_ARISTA).trim();
}

export function huellaGrafo(elementos = []) {
  // El ID, los extremos y las relaciones participan en la huella: una arista modificada la invalida.
  const lines = elementos.map(e => e.group === 'edges'
    ? `e|${e.data.id}|${e.data.source}|${e.data.target}|${e.data.tipo || ''}|${e.data.relacion || ''}`
    : `n|${e.data.id}|${e.data.tipo || ''}`).sort();
  let h = 2166136261;
  for (const ch of lines.join('\n')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return `${lines.length}:${(h >>> 0).toString(16)}`;
}

export function claveDisposicion(focos = [], huella = '') {
  return JSON.stringify([String(huella), [...new Set(focos.map(String))].sort()]);
}

export function normalizarDisposicion(value) {
  if (!value || typeof value !== 'object') return null;
  const posiciones = {};
  for (const [id, p] of Object.entries(value.posiciones || {})) {
    if (id.length > 300 || !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > 1e7 || Math.abs(p.y) > 1e7) continue;
    posiciones[id] = { x: p.x, y: p.y };
  }
  // Compatible con disposiciones del Checkpoint 5, que solo guardaban `etiquetas`.
  const etiquetas = Array.isArray(value.etiquetas) ? [...new Set(value.etiquetas.filter(x => typeof x === 'string' && x.length < 300))] : [];
  const entradas = value.titulos && typeof value.titulos === 'object' && !Array.isArray(value.titulos)
    ? Object.entries(value.titulos) : [];
  const titulos = Object.fromEntries(entradas
    .filter(([id, titulo]) => id.length > 0 && id.length < 300 && typeof titulo === 'string')
    .map(([id, titulo]) => [id, normalizarTituloArista(titulo)])
    .filter(([, titulo]) => titulo)
    .slice(0, MAX_TITULOS_POR_DISPOSICION));
  const faqExpandidas = Array.isArray(value.faqExpandidas)
    ? [...new Set(value.faqExpandidas.filter(x => typeof x === 'string' && x.startsWith('grupo_faq:') && x.length < 300))].slice(0, 150) : [];
  return { posiciones, todasEtiquetas: value.todasEtiquetas === true, etiquetas, titulos,
    tiposVisibles: normalizarTiposVisibles(value.tiposVisibles || estadoTiposInicial()), faqExpandidas,
    nodosOcultos: normalizarIds(value.nodosOcultos), nodosConservados: normalizarIds(value.nodosConservados),
    texto: normalizarEstadoTextual(value.texto),
    exploradoresTexto: normalizarContextosTexto(value.exploradoresTexto) };
}

export function leerDisposicion(storage, key) {
  try {
    const root = JSON.parse(storage?.getItem(GRAPH_LAYOUT_STORAGE_KEY) || '{}');
    return normalizarDisposicion(root?.[key]?.datos);
  } catch { return null; }
}

export function guardarDisposicion(storage, key, value) {
  const datos = normalizarDisposicion(value);
  if (!datos) return false;
  try {
    const root = JSON.parse(storage?.getItem(GRAPH_LAYOUT_STORAGE_KEY) || '{}');
    const safe = root && typeof root === 'object' && !Array.isArray(root) ? root : {};
    delete safe[key];
    safe[key] = { datos, guardado: Date.now() };
    while (Object.keys(safe).length > MAX_ENTRIES) delete safe[Object.keys(safe)[0]];
    storage?.setItem(GRAPH_LAYOUT_STORAGE_KEY, JSON.stringify(safe));
    return Boolean(storage);
  } catch { return false; }
}

export function decorarAristasFocales(elementos, focos, { todasEtiquetas = false, etiquetas = [], titulos = {} } = {}) {
  const focus = new Set(focos);
  const nombradas = new Set(etiquetas);
  return elementos.map(e => {
    if (e.group !== 'edges') return e;
    const d = e.data;
    const entreFocos = focus.has(d.source) && focus.has(d.target);
    const idEditorial = d.aristaOriginalId || d.id;
    const personalizado = normalizarTituloArista(titulos?.[idEditorial]);
    const nombre = d.agrupacionVisual && !d.aristaOriginalId ? '' :
      (personalizado || d.relacionOriginal || d.relacion || d.label || d.tipo || '');
    // Ni siquiera los enlaces entre focos imponen una etiqueta: solo las seleccionadas
    // (o el modo voluntario «mostrar todas»). El color/grosor sí destaca esos enlaces.
    const mostrar = Boolean(nombre) && (todasEtiquetas || nombradas.has(idEditorial));
    return { ...e, data: { ...d, conexionFocos: entreFocos ? 1 : 0,
      nombreAristaVisible: mostrar ? String(nombre) : '' } };
  });
}
