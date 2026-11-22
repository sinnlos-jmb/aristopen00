import assert from 'node:assert/strict';
import { filtrarGrafoDidactico, ordenarBusquedaFocal } from '../js/lab/graphDisplayPolicy.js';
import { indexarGrafo, crearEstadoFocal, obtenerSubgrafoFocal, alternarExpansion } from '../js/lab/graphFocusExpansion.js';
const nodos = [
  ['concepto_estatico:phusis','concepto_estatico'], ['concepto_estatico:arete','concepto_estatico'],
  ['nodo_funcional:phusis','nodo_funcional'], ['nodo_funcional:arete','nodo_funcional'],
  ['faq:1','faq'], ['parrafo:puente','parrafo'], ['parrafo:secundario','parrafo'],
  ['subunidad:1','subunidad'], ['concepto_estatico:energeia','concepto_estatico'],
].map(([id,tipo])=>({group:'nodes',data:{id,tipo,label:id}}));
const aristas = [
 ['a','nodo_funcional:phusis','concepto_estatico:phusis'],
 ['b','nodo_funcional:phusis','nodo_funcional:arete'],
 ['c','faq:1','concepto_estatico:phusis'],
 ['d','parrafo:puente','concepto_estatico:phusis'],
 ['e','parrafo:puente','concepto_estatico:arete'],
 ['f','parrafo:secundario','concepto_estatico:phusis'],
 ['g','subunidad:1','concepto_estatico:phusis'],
 ['h','concepto_estatico:energeia','nodo_funcional:arete'],
].map(([id,source,target])=>({group:'edges',data:{id,source,target}}));
const all=[...nodos,...aristas];
const focos=['concepto_estatico:phusis','concepto_estatico:arete'];
let base=filtrarGrafoDidactico(all,focos);
const ids=new Set(base.elementos.filter(e=>e.group==='nodes').map(e=>e.data.id));
assert(!ids.has('parrafo:puente'), 'párrafos ocultos inicialmente incluso si conectan dos focos');
assert(!ids.has('parrafo:secundario'), 'otros párrafos ocultos');
assert(!ids.has('subunidad:1'), 'subunidades excluidas');
assert(ids.has('faq:1'), 'FAQ preservada');
assert(ids.has('nodo_funcional:phusis'), 'nodos funcionales preservados');
let s=crearEstadoFocal(indexarGrafo(base.elementos),focos);
let sub=obtenerSubgrafoFocal(s);
assert(sub.nodos.has('faq:1'));
assert(sub.nodos.has('nodo_funcional:phusis'), 'remisión visible desde foco estático');
assert(!sub.nodos.has('subunidad:1'));
s=alternarExpansion(s,'nodo_funcional:phusis');
assert(obtenerSubgrafoFocal(s).nodos.has('nodo_funcional:arete'), 'expansión incluye funcionales');
s=alternarExpansion(s,'nodo_funcional:phusis');
assert(!obtenerSubgrafoFocal(s).nodos.has('nodo_funcional:arete'), 'contracción conserva la base');
const visible=filtrarGrafoDidactico(all,focos,{mostrarParrafos:true});
assert(visible.elementos.some(e=>e.data.id==='parrafo:secundario'));
assert(!visible.elementos.some(e=>e.data.id==='subunidad:1'));
const otros=filtrarGrafoDidactico(all,['concepto_estatico:phusis']);
assert(!otros.elementos.some(e=>e.data.id==='parrafo:puente'),'párrafo puente depende del conjunto focal');
const orden=ordenarBusquedaFocal([{tipo:'nodo_funcional',etiqueta:'p'},{tipo:'concepto_estatico',etiqueta:'p'},{tipo:'faq',etiqueta:'p'}]);
assert.deepEqual(orden.map(x=>x.tipo),['concepto_estatico','nodo_funcional','faq']);
console.log('OK: párrafos optativos, subunidades, FAQ, funcionales, foco y expansión.');
