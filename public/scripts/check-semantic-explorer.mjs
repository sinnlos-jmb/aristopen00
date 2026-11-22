import assert from 'node:assert/strict';
import { buildSemanticProjection, buscarNodosSemanticos, explorarVecindad, exportarRelateCypher, sugerirConceptosSemanticos } from '../js/lab/semanticProjection.js';
const S = {
  tags: { version: 'fixture-1' },
  N: { phusis: { label: 'Naturaleza', gr: 'φύσις', path: [] }, arete: { label: 'Virtud', path: ['phusis'] }, techne: { label: 'Arte', path: [] } },
  FN: { phusis: { label: 'Naturaleza funcional', remite_a: ['phusis#principio'] }, arete: { label: 'Excelencia funcional', remite_a: ['arete'] } },
  ftree: { categorias: [{ id: 'phusis', hijos: [{ id: 'arete' }] }] },
  FE: [{ de: 'phusis', a: 'arete', rel: 'contrasta', ref: 'EN I', voz: 'comentarista' }],
  U: { u1: { id: 'u1', titulo: 'Unidad primera' } },
  SUB: { sub1: { id: 'sub1', titulo: 'Subunidad uno', unidad: 'u1', bekker: ['1094a1', '1094a3'], conceptos_clave: ['phusis', 'sin_nodo'] } },
  TP: { 1: { parrafo: 1, conceptos: [{ c: 'phusis', s: 'principio', n: 'central' }] } },
  FAQ: { 'faq.1': { id: 'faq.1', pregunta: '¿Qué es la naturaleza?', arbol: { nodo: 'phusis' }, pasajes: [{ ref: 'sub1', rol: 'responde' }, { ref: 'rango_diferente', rol: 'amplia' }] } },
  DEF: { d1: { id: 'd1', concepto: 'phusis', titulo: 'Definición', referencia: { ref: '1094a1' } } },
};
const g = buildSemanticProjection(S);
assert.equal(g.version, 1);
assert.equal(g.nodes.filter(n => n.id === 'phusis').length, 2, 'no fusionar homónimos');
const check = (tipo, desde, hacia) => {
  const e = g.edges.find(e => e.tipo === tipo && e.desde === desde && e.hacia === hacia);
  assert.ok(e, `Falta ${tipo}: ${desde} → ${hacia}`); return e;
};
assert.equal(check('arista_funcional', 'nodo_funcional:phusis', 'nodo_funcional:arete').referencia, 'EN I');
assert.equal(check('remision_editorial', 'nodo_funcional:phusis', 'concepto_estatico:phusis').sentidoReferido, 'principio');
check('jerarquia_estatica', 'concepto_estatico:arete', 'concepto_estatico:phusis');
check('jerarquia_funcional', 'nodo_funcional:arete', 'nodo_funcional:phusis');
check('tag_subunidad', 'subunidad:sub1', 'concepto_estatico:phusis');
check('tag_parrafo', 'parrafo:1', 'concepto_estatico:phusis');
check('foco_faq', 'faq:faq.1', 'concepto_estatico:phusis');
check('pasaje_faq', 'faq:faq.1', 'subunidad:sub1');
check('definicion_de', 'definicion:d1', 'concepto_estatico:phusis');
assert.ok(g.issues.some(i => i.hacia === 'concepto_no_identificado:sin_nodo'));
assert.ok(g.issues.some(i => i.hacia === 'subunidad:rango_diferente'));
assert.ok(!g.nodes.some(n => n.uid === 'concepto_no_identificado:sin_nodo'), 'no inventar nodos');
assert.ok(buscarNodosSemanticos(g, 'NATURALEZA').length >= 2);
const view = explorarVecindad(g, 'concepto_estatico:phusis');
assert.ok(view.aristas.some(e => e.tipo === 'remision_editorial'));
assert.ok(view.aristas.some(e => e.tipo === 'tag_parrafo'));
assert.ok(!view.aristas.some(e => e.tipo === 'arista_funcional'), 'en 1 salto no inferir identidad de nodos');
assert.ok(explorarVecindad(g, 'concepto_estatico:phusis', { saltos: 2 }).nodos.some(n => n.uid === 'nodo_funcional:arete'));
assert.equal(explorarVecindad(g, 'nada').error, 'Nodo inexistente');
const suggestions = sugerirConceptosSemanticos(g, 'concepto_estatico:phusis');
assert.ok(suggestions.some(s => s.uid === 'nodo_funcional:arete'));
const sampleSuggestion = suggestions.find(s => s.uid === 'nodo_funcional:arete');
assert.equal(sampleSuggestion.recorrido.length, 2);
assert.deepEqual(sampleSuggestion.recorrido.map(e => e.tipo), ['remision_editorial', 'arista_funcional']);
assert.equal(sampleSuggestion.estado, 'candidato_para_explorar_no_relacion_validada');
assert.deepEqual(buildSemanticProjection(S).edges, g.edges);
const cypher = exportarRelateCypher(g, 2);
assert.match(cypher, /MERGE \(n:AgoraNodo/);
assert.match(cypher, /AGORA_VINCULO/);
assert.match(cypher, /"remision_editorial"/);
assert.match(cypher, /"principio"/);
assert.match(cypher, /"EN I"/);
assert.doesNotMatch(cypher, /DROP|DETACH DELETE/);
const special = buildSemanticProjection({ N: { quote: { label: 'O\'Brien "dos" \\ y fin' } } });
assert.match(exportarRelateCypher(special), /O'Brien \\"dos\\" \\\\ y fin/);
console.log('OK: proyección, jerarquías, tags, FAQ, dirección, incidencias, búsqueda y exportación Cypher.');
