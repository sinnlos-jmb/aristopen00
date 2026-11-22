import assert from 'node:assert/strict';
import { integrarIdentidadesVisuales } from '../js/lab/graphConceptIdentity.js';
import { filtrarGrafoDidactico } from '../js/lab/graphDisplayPolicy.js';
import { indexarGrafo, crearEstadoFocal, obtenerSubgrafoFocal } from '../js/lab/graphFocusExpansion.js';
const n = (id, tipo) => ({ group: 'nodes', data: { id, tipo, label: id } });
const e = (id, source, target, tipo) => ({ group: 'edges', data: { id, source, target, tipo } });
const src = [n('concepto_estatico:phusis','concepto_estatico'), n('nodo_funcional:phusis','nodo_funcional'),
  n('nodo_funcional:dunamis','nodo_funcional'), n('concepto_estatico:arete','concepto_estatico'),
  n('parrafo:1','parrafo'), n('subunidad:x','subunidad'), n('faq:f','faq'),
  e('f1','nodo_funcional:phusis','nodo_funcional:dunamis','arista_funcional'),
  e('p1','parrafo:1','concepto_estatico:phusis','tag_parrafo'),
  e('p2','parrafo:1','concepto_estatico:arete','tag_parrafo'),
  e('f2','concepto_estatico:phusis','faq:f','foco_faq')];
const {elementos, equivalencias, compartidos} = integrarIdentidadesVisuales(src);
assert.equal(compartidos, 1);
assert.equal(equivalencias.get('nodo_funcional:phusis'),'concepto_estatico:phusis');
assert.equal(elementos.filter(x=>x.group==='nodes').length,6);
assert.equal(elementos.find(x=>x.data.id==='f1').data.source,'concepto_estatico:phusis');
assert.equal(elementos.find(x=>x.data.id==='concepto_estatico:phusis').data.facetaFuncional,1);
const filtered=filtrarGrafoDidactico(elementos,['concepto_estatico:phusis','concepto_estatico:arete']);
assert.ok(!filtered.elementos.some(x=>x.data.id==='parrafo:1'));
assert.ok(!filtered.elementos.some(x=>x.data.id==='subunidad:x'));
const focal=obtenerSubgrafoFocal(crearEstadoFocal(indexarGrafo(filtered.elementos),['concepto_estatico:phusis']));
assert.ok(focal.nodos.has('nodo_funcional:dunamis'));
assert.ok(focal.nodos.has('faq:f'));
assert.ok(!focal.nodos.has('parrafo:1'));
const shown=filtrarGrafoDidactico(elementos,['concepto_estatico:phusis'],{mostrarParrafos:true});
assert.ok(shown.elementos.some(x=>x.data.id==='parrafo:1'));
console.log('OK: identidad gráfica compartida, aristas funcionales, FAQ y párrafos opcionales.');
