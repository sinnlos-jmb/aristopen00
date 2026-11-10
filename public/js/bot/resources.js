export const GRAPH_RESOURCES = Object.freeze({
  ergon: { label: 'El argumento del érgon', url: '/grafos/grafo_ergon.html#obra_propia' },
  alma: { label: 'El alma: partes, facultades y virtudes', url: '/grafos/grafo_alma.html#psuche' },
});

export function resourcesFor(goal) {
  if (!goal) return [];
  if (goal.id === 'faq.ergon.humano' || goal.id === 'ergon_funcion') return [
    { kind: 'graph', id: 'ergon', ...GRAPH_RESOURCES.ergon },
    { kind: 'citation', label: 'Leer el argumento en EN I.7', reference: '1097b22–1098a20' },
  ];
  if (goal.id === 'faq.psuche.partes' || goal.id === 'psuche') return [
    { kind: 'graph', id: 'alma', ...GRAPH_RESOURCES.alma },
    { kind: 'citation', label: 'Leer la división del alma en EN I.13', reference: '1102a26–1103a3' },
  ];
  return [];
}
