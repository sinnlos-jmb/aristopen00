// Checkpoint 8A. Control de visibilidad exclusivamente gráfico, nunca editorial.
// Los caminos conservados son recorridos de aristas EXISTENTES del índice.
export function normalizarIds(value, { prefijo = '', limite = 350 } = {}) {
  return Array.isArray(value) ? [...new Set(value.filter(x => typeof x === 'string' && x.length > 0 && x.length <= 300 && (!prefijo || x.startsWith(prefijo))))].slice(0, limite) : [];
}

export function caminoDesdeFocos(indice, focos, destino, ocultos = []) {
  const omitidos = new Set(ocultos);
  if (!indice.nodos.has(destino) || omitidos.has(destino)) return null;
  const origenes = [...new Set(focos)].filter(id => indice.nodos.has(id) && !omitidos.has(id));
  if (!origenes.length) return null;
  const prev = new Map(origenes.map(id => [id, null]));
  const queue = [...origenes];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (id === destino) break;
    for (const eid of indice.incidentes.get(id) || []) {
      const arista = indice.aristas.get(eid)?.data;
      if (!arista) continue;
      const next = arista.source === id ? arista.target : arista.source;
      if (omitidos.has(next) || prev.has(next)) continue;
      prev.set(next, { id, eid });
      queue.push(next);
    }
  }
  if (!prev.has(destino)) return null;
  const nodos = [destino], aristas = [];
  let actual = destino;
  while (prev.get(actual)) {
    const paso = prev.get(actual);
    aristas.unshift(paso.eid);
    nodos.unshift(paso.id);
    actual = paso.id;
  }
  return { nodos, aristas };
}

// Agrega únicamente el camino documentado más corto hacia cada nodo conservado.
// El recorrido no fuerza visibilidad de nodos que el usuario ocultó expresamente.
export function incorporarConservados(elementos, indice, focos, conservados = [], ocultos = []) {
  const nodos = new Map(elementos.filter(x => x.group === 'nodes').map(x => [x.data.id, x]));
  const aristas = new Map(elementos.filter(x => x.group === 'edges').map(x => [x.data.id, x]));
  const sinCamino = [];
  for (const id of normalizarIds(conservados)) {
    const recorrido = caminoDesdeFocos(indice, focos, id, ocultos);
    if (!recorrido) { sinCamino.push(id); continue; }
    for (const nid of recorrido.nodos) {
      const original = indice.nodos.get(nid);
      if (original && !nodos.has(nid)) nodos.set(nid, { ...original, data: { ...original.data, conservado: 1 } });
      else if (nodos.has(nid)) { const e = nodos.get(nid); nodos.set(nid, { ...e, data: { ...e.data, conservado: 1 } }); }
    }
    for (const eid of recorrido.aristas) if (!aristas.has(eid)) aristas.set(eid, indice.aristas.get(eid));
  }
  return { elementos: [...nodos.values(), ...aristas.values()], sinCamino };
}

export function ocultarNodos(elementos, ocultos = [], focos = []) {
  const protegidos = new Set(focos);
  const excluir = new Set(normalizarIds(ocultos).filter(id => !protegidos.has(id)));
  const nodos = elementos.filter(e => e.group === 'nodes' && !excluir.has(e.data.id));
  const ids = new Set(nodos.map(e => e.data.id));
  const aristas = elementos.filter(e => e.group === 'edges' && ids.has(e.data.source) && ids.has(e.data.target));
  return [...nodos, ...aristas];
}
