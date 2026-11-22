// Reglas reproducibles de 9A.1: visor independiente, procedencia y disposiciones por ancla.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buscarVinculosTextuales } from '../js/lab/graphTextNavigation.js';
import { construirGrafoContextual, claveContextoTextual, estadoContextoInicial,
  normalizarEstadoContexto, normalizarContextosTexto, idAnclaContextual } from '../js/lab/graphTextContext.js';
import { guardarDisposicion, leerDisposicion } from '../js/lab/graphLayoutPersistence.js';

const S = {
  U: {
    u1: { id: 'u1', titulo: 'Unidad 1', parrafos: [1], subunidades: [{id:'s1',titulo:'Sub 1',bekker:['1098a1','1098a4']},{id:'s2',titulo:'Sub 2',bekker:['1098a5','1098a8']}] },
    u2: { id: 'u2', titulo: 'Unidad 2', parrafos: [2], subunidades: [{id:'s3',titulo:'Sub 3',bekker:['1099a1','1099a3']}] },
  },
  SUB: {
    s1: { id:'s1', unidad:'u1', titulo:'Sub 1', bekker:['1098a1','1098a4'], conceptos_clave:['arete'], relaciones:[{ de:'arete', a:'eudaimonia', destinos:[{arista:'a-cond',ref:'EN I.7'}] }] },
    s2: { id:'s2', unidad:'u1', titulo:'Sub 2', bekker:['1098a5','1098a8'], conceptos_clave:[], relaciones:[] },
    s3: { id:'s3', unidad:'u2', titulo:'Sub 3', bekker:['1099a1','1099a3'], conceptos_clave:[], relaciones:[] },
  },
  TP: { 2: { conceptos:[{c:'arete',n:'presente'}] } },
  FAQ: { x: {pasajes:[{ref:'u:u2'}]} },
};
const a = { tipo:'concepto', id:'arete', nodo:'concepto_estatico:arete' };
const f = { tipo:'faq', id:'x', nodo:'faq:x' };
const e = { tipo:'arista_funcional', id:'a-cond', arista:'vinculo:123', source:'concepto_estatico:arete', target:'concepto_estatico:eudaimonia' };
const units = buscarVinculosTextuales(S,a);
assert.equal(units.length,2);
assert.equal(units[0].subunidades.length,1);
assert.equal(units[1].subunidades.length,0, 'tag de párrafo no acredita subunidad');
assert.notEqual(claveContextoTextual(a), claveContextoTextual(f));
assert.notEqual(claveContextoTextual(a), claveContextoTextual(e));
assert.equal(claveContextoTextual({tipo:'foo',id:'x'}),null);

const inicial = construirGrafoContextual(a,'Areté',units,estadoContextoInicial());
assert.equal(inicial.unidadesVisibles,2);
assert.equal(inicial.subunidadesVisibles,0);
assert.equal(inicial.elementos.filter(x=>x.group==='nodes' && x.data.anclaContextual).length,1, 'un único foco en el modal');
assert.equal(inicial.elementos.filter(x=>x.group==='nodes').length,3);
assert(inicial.elementos.every(x=>x.data.id.startsWith('texto:')),'ningún nodo del corpus se duplica');
assert(inicial.elementos.filter(x=>x.group==='edges').every(x=>x.data.fuente==='presentacion'));
assert(inicial.elementos.every(x=>!x.data.aristaFuente),'el modal no introduce aristas filosóficas');

const expandido = construirGrafoContextual(a,'Areté',units,{unidadesAbiertas:['u1']});
assert.equal(expandido.subunidadesVisibles,1);
const completo = construirGrafoContextual(a,'Areté',units,{unidadesAbiertas:['u1'],unidadesCompletas:['u1']});
assert.equal(completo.subunidadesVisibles,2);
assert.equal(completo.elementos.find(x=>x.data.subunidadId==='s1').data.vinculada,1);
assert.equal(completo.elementos.find(x=>x.data.subunidadId==='s2').data.vinculada,0);
const plegado = construirGrafoContextual(a,'Areté',units,{unidadesAbiertas:[]});
assert.equal(plegado.subunidadesVisibles,0);
const anclaRel = construirGrafoContextual(e,'Relación condición',buscarVinculosTextuales(S,e),{});
assert.equal(anclaRel.elementos.filter(x=>x.data.anclaContextual).length,1);
assert(!anclaRel.elementos.some(x=>x.data.id==='concepto_estatico:arete'));
assert.equal(buscarVinculosTextuales(S,f).length,1);

const corrupted = normalizarEstadoContexto({ unidadesAbiertas:['u1','u1',null], posiciones:{a:{x:2,y:3},b:{x:Infinity,y:3},c:{x:2,y:2e10}} });
assert.deepEqual(corrupted.unidadesAbiertas,['u1']);
assert.deepEqual(corrupted.posiciones,{a:{x:2,y:3}});
const storage = new Map();
const mock = {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const qa=claveContextoTextual(a), qf=claveContextoTextual(f);
assert(guardarDisposicion(mock,'focos_demo',{posiciones:{'concepto_estatico:arete':{x:11,y:12}},
  titulos:{'vinculo:1':'Condición de'}, exploradoresTexto:{[qa]:{unidadesAbiertas:['u1'],posiciones:{[idAnclaContextual(a)]:{x:5,y:6}}},[qf]:{unidadesCompletas:['u2']}}}));
const stored=leerDisposicion(mock,'focos_demo');
assert.equal(stored.titulos['vinculo:1'],'Condición de');
assert.deepEqual(stored.exploradoresTexto[qa].unidadesAbiertas,['u1']);
assert.deepEqual(stored.exploradoresTexto[qf].unidadesCompletas,['u2']);
assert.deepEqual(stored.posiciones['concepto_estatico:arete'],{x:11,y:12});
assert.deepEqual(normalizarContextosTexto({invalid:{},[qa]:{} })[qa],estadoContextoInicial());

const view=readFileSync(new URL('../js/views/labGraphPilotView.js', import.meta.url),'utf8');
for (const marker of ['gv-text-dialog','dialogoTexto.showModal()','layoutContextual: true','abrirExploradorTexto','construirGrafoContextual','exploradoresTexto'])
  assert(view.includes(marker),`falta ${marker}`);
assert(!view.includes('construirCapaTextual('),'no colocar unidades en grafo principal');
assert(!view.includes('viewer?.enfocar(idHubTexto'),'no enfocar un hub textual inexistente');
const css=readFileSync(new URL('../css/lab-graph-text-modal-9a1.css', import.meta.url),'utf8');
assert(css.includes('::backdrop') && css.includes('grid-template-columns'));
console.log('OK: 9A.1 ancla única, modal independiente, vínculos verificables, subunidades contextuales y persistencia separada.');
