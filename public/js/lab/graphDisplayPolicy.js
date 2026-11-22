// Política de visualización, no de edición: conserva intacta la proyección documental.
// No representar asociaciones de indexación como vecindad filosófica inicial.
// Párrafos y subunidades sólo se incorporan por acción explícita.
export function filtrarGrafoDidactico(elementos, focos = [], { mostrarParrafos = false } = {}) {
  const nodos = elementos.filter(el => el.group === 'nodes');
  const aristas = elementos.filter(el => el.group === 'edges');
  const tipos = new Map(nodos.map(n => [n.data.id, n.data.tipo]));
  const focosSet = new Set(focos);
  const vecinosFocoPorParrafo = new Map();
  for (const a of aristas) {
    const { source, target } = a.data;
    if (tipos.get(source) === 'parrafo' && focosSet.has(target)) {
      if (!vecinosFocoPorParrafo.has(source)) vecinosFocoPorParrafo.set(source, new Set());
      vecinosFocoPorParrafo.get(source).add(target);
    }
    if (tipos.get(target) === 'parrafo' && focosSet.has(source)) {
      if (!vecinosFocoPorParrafo.has(target)) vecinosFocoPorParrafo.set(target, new Set());
      vecinosFocoPorParrafo.get(target).add(source);
    }
  }
  const puente = new Set([...vecinosFocoPorParrafo]
    .filter(([, vecinos]) => vecinos.size >= 2).map(([id]) => id));
  const mostrar = n => n.data.tipo !== 'subunidad' &&
    (n.data.tipo !== 'parrafo' || mostrarParrafos);
  const visibles = nodos.filter(mostrar);
  const ids = new Set(visibles.map(n => n.data.id));
  return {
    elementos: [...visibles, ...aristas.filter(a => ids.has(a.data.source) && ids.has(a.data.target))],
    puentes: puente,
    excluidos: {
      subunidades: nodos.filter(n => n.data.tipo === 'subunidad').length,
      parrafos: nodos.filter(n => n.data.tipo === 'parrafo' && !ids.has(n.data.id)).length,
    },
  };
}

export function ordenarBusquedaFocal(resultados) {
  const prioridad = { concepto_estatico: 0, nodo_funcional: 1, faq: 2, definicion: 3, unidad: 4 };
  return [...resultados].sort((a,b) =>
    (prioridad[a.tipo] ?? 8) - (prioridad[b.tipo] ?? 8) ||
    String(a.etiqueta).localeCompare(String(b.etiqueta), 'es'));
}
