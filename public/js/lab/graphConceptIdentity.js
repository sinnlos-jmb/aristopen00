// Sólo en la vista: una identidad gráfica por concepto compartido.
// No modifica la proyección editorial ni fusiona fuentes de datos.
export const idVisual = id => {
  const text = String(id || '');
  return text.startsWith('nodo_funcional:') ? `concepto_estatico:${text.slice('nodo_funcional:'.length)}` : text;
};

export function integrarIdentidadesVisuales(elementos = []) {
  const original = new Map(elementos.filter(e => e.group === 'nodes').map(e => [e.data.id, e]));
  const nodos = new Map();
  const equivalencias = new Map();
  for (const node of original.values()) {
    const id = node.data.id;
    const shared = id.startsWith('nodo_funcional:') && original.has(idVisual(id));
    const canonical = shared ? idVisual(id) : id;
    equivalencias.set(id, canonical);
    if (shared) continue;
    const functional = id.startsWith('nodo_funcional:') || original.has(`nodo_funcional:${id.slice('concepto_estatico:'.length)}`) && id.startsWith('concepto_estatico:');
    nodos.set(canonical, { ...node, data: { ...node.data, facetaFuncional: functional ? 1 : 0,
      facetaEstatica: id.startsWith('concepto_estatico:') ? 1 : 0,
      identidadCompartida: functional && id.startsWith('concepto_estatico:') ? 1 : 0 } });
  }
  const aristas = elementos.filter(e => e.group === 'edges').map(edge => {
    const source = equivalencias.get(edge.data.source), target = equivalencias.get(edge.data.target);
    if (!source || !target || source === target) return null;
    return { ...edge, data: { ...edge.data, source, target } };
  }).filter(Boolean);
  return { elementos: [...nodos.values(), ...aristas], equivalencias,
    compartidos: [...nodos.values()].filter(n => n.data.identidadCompartida).length };
}
