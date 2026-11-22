// N1-U.12 · Preferencias VISUALES locales y colapso documental. No modifica el corpus.
export const DISPLAY_STORAGE_KEY = 'agora.lab.arquitectura.lectura.v1';
export const MONO_FONT = '"DejaVu Sans Mono", "Noto Sans Mono", "FreeMono", Consolas, "Liberation Mono", monospace';
export const DEFAULT_DISPLAY = Object.freeze({ readerFont: 18, graphFont: 17, showEdgeNames: true });
const inRange = (x,lo,hi) => Number.isInteger(x) && x >= lo && x <= hi;
export function normalizarDisplay(input) {
  return {
    readerFont: inRange(input?.readerFont,14,30) ? input.readerFont : DEFAULT_DISPLAY.readerFont,
    graphFont: inRange(input?.graphFont,12,26) ? input.graphFont : DEFAULT_DISPLAY.graphFont,
    showEdgeNames: typeof input?.showEdgeNames === 'boolean' ? input.showEdgeNames : true,
  };
}
export function cargarDisplay(storage) {
  try { return normalizarDisplay(JSON.parse(storage?.getItem(DISPLAY_STORAGE_KEY) || '{}')); }
  catch { return { ...DEFAULT_DISPLAY }; }
}
export function guardarDisplay(storage, prefs) {
  const normal = normalizarDisplay(prefs);
  if (storage?.setItem) storage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(normal));
  return normal;
}
export function variarFuente(prefs, campo, delta) {
  if (!['readerFont','graphFont'].includes(campo)) throw new Error('Fuente desconocida');
  const lo = campo === 'readerFont' ? 14 : 12;
  const hi = campo === 'readerFont' ? 30 : 26;
  return { ...normalizarDisplay(prefs), [campo]: Math.max(lo,Math.min(hi,normalizarDisplay(prefs)[campo]+delta)) };
}

// Proyecta un árbol de respaldo editorial: la ficha → macrounidades → unidades → pasajes.
// SOLO sigue las dos clases de enlaces estructurales explícitos; nunca infiere aristas.
const TREE_EDGE_TYPES = new Set(['contexto_ficha','pertenencia_estructural']);
export function hijosEstructurales(elementos) {
  const nodes = new Set(elementos.filter(e=>e.group==='nodes').map(e=>e.data.id));
  const children = new Map();
  for (const e of elementos) {
    if (e.group !== 'edges' || !TREE_EDGE_TYPES.has(e.data.tipo)) continue;
    if (!nodes.has(e.data.source) || !nodes.has(e.data.target)) continue;
    if (!children.has(e.data.source)) children.set(e.data.source,[]);
    children.get(e.data.source).push(e.data.target);
  }
  return children;
}
export function proyectarRamasEstructurales(elementos, colapsados = new Set()) {
  const children = hijosEstructurales(elementos);
  const roots = elementos.filter(e=>e.group==='nodes' && e.data.tipo==='ficha_central').map(e=>e.data.id);
  if (roots.length !== 1) throw new Error('El respaldo debe tener una sola ficha central');
  const visibles = new Set(), pendientes = [...roots];
  while (pendientes.length) {
    const id = pendientes.shift();
    if (visibles.has(id)) continue;
    visibles.add(id);
    if (!colapsados.has(id)) pendientes.push(...(children.get(id)||[]));
  }
  return elementos.filter(e => e.group === 'nodes' ? visibles.has(e.data.id)
    : visibles.has(e.data.source) && visibles.has(e.data.target)).map(e=>{
    if (e.group !== 'nodes') return e;
    const hasChildren = (children.get(e.data.id)||[]).length > 0;
    const isCollapsed = hasChildren && colapsados.has(e.data.id);
    return { ...e, data: { ...e.data, tieneHijos:hasChildren?1:0, colapsado:isCollapsed?1:0,
      label: e.data.label + (isCollapsed ? '  [+]' : '') } };
  });
}
