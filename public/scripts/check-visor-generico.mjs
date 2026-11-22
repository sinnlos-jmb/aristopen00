import assert from 'node:assert/strict';
import { buildSemanticProjection } from '../js/lab/semanticProjection.js';
import { proyeccionAElementos, resumenClasesAElementos, estadisticasElementos } from '../js/lab/semanticGraphAdapter.js';
const g = buildSemanticProjection({
  N: { phusis: { label: 'Naturaleza', path: [] }, techne: { label: 'Técnica', path: ['phusis'] } },
  FN: { phusis: { label: 'Naturaleza funcional', remite_a: ['phusis#principio'] } },
  FE: [{ de: 'phusis', a: 'phusis', rel: 'es', voz: 'nuestra' }],
});
const els = proyeccionAElementos(g);
assert.deepEqual(estadisticasElementos(els), { nodos: g.stats.nodos, aristas: g.stats.aristas });
assert.ok(els.some(e => e.group === 'edges' && e.data.tipo === 'remision_editorial'
  && e.data.source === 'nodo_funcional:phusis' && e.data.target === 'concepto_estatico:phusis'));
assert.equal(els.filter(e => e.group === 'nodes' && e.data.id.endsWith(':phusis')).length, 2);
assert.ok(els.filter(e => e.group === 'nodes' && e.data.tipo === 'concepto_estatico').length === 2);
assert.deepEqual(estadisticasElementos(proyeccionAElementos(g, { tipos: ['nodo_funcional'] })), { nodos: 1, aristas: 1 });
const groups = resumenClasesAElementos(g);
assert.equal(groups.filter(e => e.group === 'nodes').length, 2);
assert.equal(groups.filter(e => e.group === 'nodes').reduce((n,e) => n+e.data.cantidad, 0), g.nodes.length);
assert.equal(groups.filter(e => e.group === 'edges').reduce((n,e) => n+e.data.cantidad, 0), g.edges.length);
assert.ok(!groups.some(e => e.group === 'edges' && e.data.source.startsWith('concepto_estatico:')), 'los enlaces agrupados no son conceptos');
console.log('OK: adaptador genérico de grafo, identidad, dirección, filtros y agregación sin pérdida de conteos.');
