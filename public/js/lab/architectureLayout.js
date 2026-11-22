// N1-U.10 · Preferencias VISUALES locales; nunca modifica fichas, aristas ni MariaDB.
export const LAYOUT_STORAGE_KEY = 'agora.lab.arquitectura.posiciones.v1';
export const LAYOUT_SCHEMA = 'agora.lab.layout.v1';
const VALID_GROUP = /^(red-fichas:|puente:[\w.:-]+:|ficha:[\w.:-]+:|modulos:|relaciones:|estructura:)$/;
const MAX_NODES = 600;
const safeCoord = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100000;

export function layoutParaGuardar(posiciones) {
  if (!(posiciones instanceof Map)) throw new TypeError('Las posiciones deben ser un Map');
  const nodes = [];
  for (const [key, p] of posiciones) {
    if (typeof key !== 'string' || key.length > 220 || !p || !safeCoord(p.x) || !safeCoord(p.y)) continue;
    const sep = key.lastIndexOf(':');
    // Los IDs de nodo pueden contener dos puntos; detectar grupo por prefijo, no por último separador.
    const prefix = ['red-fichas:', 'modulos:', 'relaciones:', 'estructura:'].find(s => key.startsWith(s))
      || (/^(puente:[^:]+:(?:orientacion|apoyos):)/.exec(key)?.[1])
      || (/^(ficha:[^:]+:)/.exec(key)?.[1]);
    if (!prefix || !VALID_GROUP.test(prefix) || key.length <= prefix.length) continue;
    nodes.push({ group: prefix, id: key.slice(prefix.length), x: p.x, y: p.y });
  }
  if (nodes.length > MAX_NODES) throw new Error('Demasiados nodos para guardar');
  return { schema: LAYOUT_SCHEMA, nodes };
}

export function leerLayout(raw) {
  const doc = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!doc || doc.schema !== LAYOUT_SCHEMA || !Array.isArray(doc.nodes) || doc.nodes.length > MAX_NODES) throw new Error('Archivo de disposición inválido');
  const map = new Map();
  for (const n of doc.nodes) {
    if (!n || typeof n.group !== 'string' || !VALID_GROUP.test(n.group) ||
        typeof n.id !== 'string' || !n.id || n.id.length > 180 || !safeCoord(n.x) || !safeCoord(n.y)) throw new Error('Nodo de disposición inválido');
    const key = n.group + n.id;
    if (map.has(key)) throw new Error('Nodo duplicado en la disposición');
    map.set(key, { x: n.x, y: n.y });
  }
  return map;
}

export function cargarLayoutLocal(storage) {
  try { const raw = storage?.getItem(LAYOUT_STORAGE_KEY); return raw ? leerLayout(raw) : new Map(); }
  catch { return new Map(); } // Nunca impedir abrir el Lab por un problema de almacenamiento.
}

export function guardarLayoutLocal(storage, positions) {
  if (!storage || typeof storage.setItem !== 'function') throw new Error('Almacenamiento local no disponible');
  const doc = layoutParaGuardar(positions);
  storage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(doc));
  return doc.nodes.length;
}

export function limpiarGrupo(positions, group) {
  if (!VALID_GROUP.test(group)) throw new Error('Grupo de grafo no reconocido');
  for (const key of positions.keys()) if (key.startsWith(group)) positions.delete(key);
}
