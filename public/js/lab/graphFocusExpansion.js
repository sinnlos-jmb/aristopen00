// Grafo focal de sólo lectura. La base contiene focos y TODAS sus aristas
// incidentes (entrantes y salientes), pero ninguna arista entre vecinos por
// el solo hecho de compartir vecindad. Las expansiones agregan una capa.
// Esta lógica no depende de Cytoscape ni altera el corpus original.
export function indexarGrafo(elementos = []) {
  const nodos = new Map();
  const aristas = new Map();
  const incidentes = new Map();
  for (const el of elementos) {
    if (el.group !== 'nodes') continue;
    const id = el.data?.id;
    if (typeof id !== 'string' || nodos.has(id)) continue;
    nodos.set(id, el);
    incidentes.set(id, []);
  }
  for (const el of elementos) {
    if (el.group !== 'edges') continue;
    const { id, source, target } = el.data || {};
    if (typeof id !== 'string' || aristas.has(id) || !nodos.has(source) || !nodos.has(target)) continue;
    aristas.set(id, el);
    incidentes.get(source).push(id);
    if (target !== source) incidentes.get(target).push(id);
  }
  return { nodos, aristas, incidentes };
}

export function crearEstadoFocal(indice, focos = []) {
  return { indice, focos: [...new Set(focos)].filter(id => indice.nodos.has(id)), expandidos: new Set() };
}

export function cambiarFocos(estado, focos) {
  return crearEstadoFocal(estado.indice, focos);
}

const otroExtremo = (arista, id) => arista.data.source === id ? arista.data.target : arista.data.source;

function calcularVisibilidad(estado) {
  const { indice, focos, expandidos } = estado;
  const nodos = new Set(focos);
  const aristas = new Set();
  const compartidos = new Map();
  const incorporar = id => {
    for (const eid of indice.incidentes.get(id) || []) {
      const e = indice.aristas.get(eid);
      aristas.add(eid);
      nodos.add(e.data.source);
      nodos.add(e.data.target);
    }
  };
  // Los focos siempre conservan su vecindad inmediata; no son plegables.
  for (const id of focos) {
    incorporar(id);
    for (const eid of indice.incidentes.get(id) || []) {
      const vecino = otroExtremo(indice.aristas.get(eid), id);
      if (!compartidos.has(vecino)) compartidos.set(vecino, new Set());
      compartidos.get(vecino).add(id);
    }
  }
  // Expansiones sucesivas, siempre desde nodos que ya son visibles.
  // Cada elemento se procesa una sola vez; los ciclos son seguros.
  const procesados = new Set();
  let pendientes = [...nodos];
  while (pendientes.length) {
    const id = pendientes.pop();
    if (procesados.has(id)) continue;
    procesados.add(id);
    if (!expandidos.has(id)) continue;
    const previos = new Set(nodos);
    incorporar(id);
    for (const nuevo of nodos) if (!previos.has(nuevo)) pendientes.push(nuevo);
  }
  return { nodos, aristas, compartidos };
}

export function obtenerSubgrafoFocal(estado) {
  const { indice, focos, expandidos } = estado;
  const { nodos, aristas, compartidos } = calcularVisibilidad(estado);
  const elementos = [
    ...[...nodos].map(id => {
      const n = indice.nodos.get(id);
      return { ...n, data: { ...n.data, foco: focos.includes(id) ? 1 : 0,
        expandido: expandidos.has(id) ? 1 : 0,
        compartido: (compartidos.get(id)?.size || 0) >= 2 ? 1 : 0 } };
    }),
    ...[...aristas].map(id => indice.aristas.get(id)),
  ];
  return { elementos, nodos, aristas,
    estadisticas: { nodos: nodos.size, aristas: aristas.size,
      expandidos: [...expandidos].filter(id => nodos.has(id)).length,
      vecinosCompartidos: [...compartidos].filter(([,v]) => v.size >= 2).length } };
}

export function alternarExpansion(estado, id) {
  if (!estado.indice.nodos.has(id) || estado.focos.includes(id)) return estado;
  const visibles = calcularVisibilidad(estado).nodos;
  if (!visibles.has(id)) return estado;
  const expandidos = new Set(estado.expandidos);
  if (expandidos.has(id)) expandidos.delete(id);
  else expandidos.add(id);
  const siguiente = { ...estado, expandidos };
  // Al plegar un antecesor, olvidar también las expansiones que quedaron
  // inaccesibles. Un nodo compartido sigue abierto si aún es alcanzable.
  let cambio = true;
  while (cambio) {
    cambio = false;
    const actuales = calcularVisibilidad(siguiente).nodos;
    for (const x of expandidos) {
      if (!actuales.has(x)) { expandidos.delete(x); cambio = true; }
    }
  }
  return siguiente;
}

export function restaurarBaseFocal(estado) {
  return { ...estado, expandidos: new Set() };
}
