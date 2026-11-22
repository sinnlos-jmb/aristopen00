import assert from 'node:assert/strict';
import { huellaGrafo, claveDisposicion, decorarAristasFocales, guardarDisposicion,
  leerDisposicion, GRAPH_LAYOUT_STORAGE_KEY } from '../js/lab/graphLayoutPersistence.js';
import { indexarGrafo, crearEstadoFocal, obtenerSubgrafoFocal, alternarExpansion } from '../js/lab/graphFocusExpansion.js';

const node = id => ({ group: 'nodes', data: { id, tipo: 'concepto_estatico', label: id } });
const edge = (id, a, b, relacion) => ({ group: 'edges', data: { id, source: a, target: b, tipo: 'arista_funcional', relacion } });
const all = [node('phusis'), node('arete'), node('eudaimonia'), node('dunamis'), node('hexis'),
  edge('rel1','arete','eudaimonia','condicion'), edge('rel2','phusis','dunamis','potencia'),
  edge('rel3','dunamis','hexis','transicion')];
const key = claveDisposicion(['eudaimonia','arete','phusis'], huellaGrafo(all));
assert.equal(key,claveDisposicion(['phusis','arete','eudaimonia'],huellaGrafo(all)));
assert.notEqual(key,claveDisposicion(['arete','phusis'],huellaGrafo(all)));
assert.notEqual(huellaGrafo(all),huellaGrafo([...all.slice(0,-1),edge('rel3','dunamis','hexis','otra')]));
const state = crearEstadoFocal(indexarGrafo(all),['phusis','arete','eudaimonia']);
const base = decorarAristasFocales(obtenerSubgrafoFocal(state).elementos, state.focos);
assert.equal(base.find(x=>x.data.id==='rel1').data.conexionFocos,1);
assert.equal(base.find(x=>x.data.id==='rel1').data.nombreAristaVisible,'', 'arista focal destacada sin etiqueta por defecto');
assert.equal(base.find(x=>x.data.id==='rel2').data.conexionFocos,0);
assert.equal(base.find(x=>x.data.id==='rel2').data.nombreAristaVisible,'');
assert.ok(!base.some(x=>x.data.id==='rel3'));
const expanded = obtenerSubgrafoFocal(alternarExpansion(state,'dunamis')).elementos;
assert.ok(expanded.some(x=>x.data.id==='rel3'));
assert.equal(decorarAristasFocales(expanded,state.focos,{etiquetas:['rel3']})
  .find(x=>x.data.id==='rel3').data.nombreAristaVisible,'transicion');
assert.equal(decorarAristasFocales(base,state.focos,{todasEtiquetas:true})
  .find(x=>x.data.id==='rel2').data.nombreAristaVisible,'potencia');
assert.equal(all.find(x=>x.data.id==='rel1').data.conexionFocos,undefined, 'sin mutación editorial');
const storage = new Map();
const mock = { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v) };
assert.equal(leerDisposicion(mock,key),null);
assert.equal(guardarDisposicion(mock,key,{posiciones:{arete:{x:11,y:-5},bad:{x:Infinity,y:4}},etiquetas:['rel2'],todasEtiquetas:false}),true);
assert.deepEqual(leerDisposicion(mock,key).posiciones,{arete:{x:11,y:-5}});
assert.deepEqual(leerDisposicion(mock,key).etiquetas,['rel2']);
assert.ok(storage.has(GRAPH_LAYOUT_STORAGE_KEY));
assert.equal(leerDisposicion({getItem:()=>'{mal'},key),null);
assert.equal(guardarDisposicion({getItem:()=>null,setItem:()=>{throw Error('quota')}},key,{}),false);
for(let i=0;i<35;i++) guardarDisposicion(mock,`foco${i}`,{posiciones:{}});
assert.ok(Object.keys(JSON.parse(storage.get(GRAPH_LAYOUT_STORAGE_KEY))).length<=30);
console.log('OK: aristas foco-foco destacadas, etiquetas opcionales, huellas, persistencia, corrupción y cuota.');
