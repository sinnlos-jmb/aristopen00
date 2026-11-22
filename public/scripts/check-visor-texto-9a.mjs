// Checkpoint 9A: evidencia textual y navegación sin inventar vínculos ni editar corpus.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buscarVinculosTextuales, construirCapaTextual, normalizarEstadoTextual, estadoTextualInicial,
  idHubTexto, idUnidadTexto, idSubunidadTexto } from '../js/lab/graphTextNavigation.js';
import { guardarDisposicion, leerDisposicion } from '../js/lab/graphLayoutPersistence.js';
import { buildSemanticProjection } from '../js/lab/semanticProjection.js';
import { proyeccionAElementos } from '../js/lab/semanticGraphAdapter.js';
import { integrarIdentidadesVisuales } from '../js/lab/graphConceptIdentity.js';

const S = {
  N: { arete: { id:'arete', label:'Virtud', path:[] }, eudaimonia: { id:'eudaimonia', label:'Felicidad', path:[] } },
  FN: { arete: { id:'arete', label:'Virtud', depth:2 }, eudaimonia: { id:'eudaimonia', label:'Felicidad', depth:2 } },
  FE: [{id:'a-cond', de:'arete', a:'eudaimonia', rel:'condicion', ref:'EN I.7', voz:'textual'}],
  U: {
    u1: { id:'u1', titulo:'Unidad 1', parrafos:[1], subunidades:[{id:'s1',titulo:'Sub 1',bekker:['1098a1','1098a4']},{id:'s2',titulo:'Sub 2',bekker:['1098a5','1098a8']}] },
    u2: { id:'u2', titulo:'Unidad 2', parrafos:[2], subunidades:[{id:'s3',titulo:'Sub 3',bekker:['1099a1','1099a3']}] },
    u3: { id:'u3', titulo:'Unidad 3', parrafos:[], subunidades:[{id:'s4',titulo:'Sub 4',bekker:['1100a1','1100a3']}] },
  },
  SUB: {
    s1: {id:'s1',unidad:'u1',titulo:'Sub 1',bekker:['1098a1','1098a4'],conceptos_clave:['arete'],relaciones:[{de:'arete',a:'eudaimonia',ref:'EN I.7',destinos:[{arista:'a-cond',ref:'EN I.7'}]}]},
    s2: {id:'s2',unidad:'u1',titulo:'Sub 2',bekker:['1098a5','1098a8'],conceptos_clave:[],relaciones:[]},
    s3: {id:'s3',unidad:'u2',titulo:'Sub 3',bekker:['1099a1','1099a3'],conceptos_clave:[],relaciones:[]},
    s4: {id:'s4',unidad:'u3',titulo:'Sub 4',bekker:['1100a1','1100a3'],conceptos_clave:[],relaciones:[{de:'moralidad abstracta',a:'arete en general',ref:'EN I.7'}]},
  },
  TP: { 1:{ parrafo:1, conceptos:[{c:'arete',n:'central'}] }, 2:{parrafo:2, conceptos:[{c:'arete',n:'presente'}]} },
  FAQ: { x:{id:'x',pregunta:'¿Qué es virtud?',pasajes:[{ref:'u:u2'},{ref:'s1'}]} },
  DEF:{}, ftree:{categorias:[]}, tags:{ version:'v-test' },
};
const concepto = {tipo:'concepto',id:'arete',nodo:'concepto_estatico:arete'};
const fc = buscarVinculosTextuales(S, concepto);
assert.equal(fc.length,2, 'el tag del párrafo vincula u2, pero no u3');
assert.equal(fc[0].id,'u1', 'prioridad para vínculo directo');
assert.deepEqual(fc[0].subunidades.map(x=>x.id),['s1']);
assert.deepEqual(fc[1].subunidades,[], 'un tag de párrafo NO acredita una subunidad');
assert(fc[1].motivos.some(x=>x.via==='tag_parrafo_contexto_unidad'));
assert(!fc.some(x=>x.id==='u3'), 'no atribuir relación con extremo en texto libre');
assert.equal(fc[0].todasSubunidades.length,2);

const rel = {tipo:'arista_funcional',id:'a-cond',arista:'vinculo:123',source:'concepto_estatico:arete',target:'concepto_estatico:eudaimonia'};
const fr = buscarVinculosTextuales(S, rel);
assert.equal(fr.length,1);
assert.deepEqual(fr[0].subunidades.map(x=>x.id),['s1']);
assert.equal(fr[0].subunidades[0].motivos[0].via,'destino_arista_funcional');
assert.deepEqual(buscarVinculosTextuales(S,{...rel,id:'otra'}),[], 'sin un destino documentado no se inventa');
const fq = buscarVinculosTextuales(S,{tipo:'faq',id:'x',nodo:'faq:x'});
assert.equal(fq.length,2);
assert(fq.some(u=>u.id==='u2'&&u.subunidades.length===0), 'u: es una unidad');
assert(fq.some(u=>u.id==='u1'&&u.subunidades[0].id==='s1'), 'ID de subunidad exacto');

const ne = (id,tipo) => ({group:'nodes',data:{id,label:id,tipo}});
const ae = (id,source,target) => ({group:'edges',data:{id,source,target,tipo:'arista_funcional'}});
const base = [ne('concepto_estatico:arete','concepto_estatico'),ne('concepto_estatico:eudaimonia','concepto_estatico'),ae(rel.arista,rel.source,rel.target)];
const none = construirCapaTextual(base,fc,estadoTextualInicial());
assert.equal(none.visible,false);
const collapsed = construirCapaTextual(base,fc,{ancla:concepto});
assert.equal(collapsed.visible,true);
assert(collapsed.elementos.some(x=>x.data.id===idHubTexto(concepto)));
assert(!collapsed.elementos.some(x=>x.data.id===idUnidadTexto('u1')));
const expanded = construirCapaTextual(base,fc,{ancla:concepto,abierto:true,unidadesAbiertas:['u1']});
assert(expanded.elementos.some(x=>x.data.id===idUnidadTexto('u1')));
assert(expanded.elementos.some(x=>x.data.id===idSubunidadTexto('s1')));
assert(!expanded.elementos.some(x=>x.data.id===idSubunidadTexto('s2')));
assert(!expanded.elementos.some(x=>x.data.id===idSubunidadTexto('s3')));
assert.equal(expanded.elementos.filter(e=>e.data.navegacionTextual && e.group==='edges').every(e=>e.data.fuente==='presentacion'),true);
assert.deepEqual(base[0].data,{id:rel.source,label:rel.source,tipo:'concepto_estatico'},'nunca mutar corpus');
const full = construirCapaTextual(base,fc,{ancla:concepto,abierto:true,unidadesAbiertas:['u1'],unidadesCompletas:['u1']});
assert(full.elementos.some(x=>x.data.id===idSubunidadTexto('s2')));
assert(!full.elementos.some(x=>x.data.id===idSubunidadTexto('s3')));
const fromEdge = construirCapaTextual(base,fr,{ancla:rel,abierto:true});
assert(fromEdge.elementos.some(x=>x.data.anclaRelacion));
assert(fromEdge.elementos.some(x=>x.data.id===idUnidadTexto('u1')));
assert.equal(construirCapaTextual(base.slice(0,2),fr,{ancla:rel}).visible,false, 'si la arista original desaparece, no queda evidencia fantasma');
assert.equal(normalizarEstadoTextual({ancla:{tipo:'concepto',id:'',nodo:'x'}}).ancla,null);
assert.deepEqual(normalizarEstadoTextual({abierto:true,unidadesAbiertas:['u1','u1','']} ).unidadesAbiertas,['u1']);

const storage=new Map();
const mock={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
assert(guardarDisposicion(mock,'test9a',{posiciones:{},texto:{ancla:concepto,abierto:true,unidadesAbiertas:['u1'],unidadesCompletas:['u1']}}));
assert.equal(leerDisposicion(mock,'test9a').texto.ancla.id,'arete');
assert.deepEqual(leerDisposicion(mock,'test9a').texto.unidadesCompletas,['u1']);
assert.equal(leerDisposicion(mock,'test9a').titulos.a,undefined,'compatible con persistencia anterior');

const projection=buildSemanticProjection(S);
const elems=integrarIdentidadesVisuales(proyeccionAElementos(projection)).elementos;
const functional=elems.find(e=>e.group==='edges'&&e.data.tipo==='arista_funcional');
assert.equal(functional.data.aristaFuente,'a-cond','identidad editorial estable de la arista');
assert.equal(functional.data.source,'concepto_estatico:arete','identidad conceptual compartida');

const view=readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../js/views/labGraphPilotView.js'),'utf8');
// 9A.1 conserva el índice/proyección de 9A, pero desplaza la interacción a un modal independiente.
for(const text of ['data-gv-text-open','gv-text-dialog','abrirExploradorTexto','construirGrafoContextual','layoutContextual: true'])
  assert(view.includes(text),`falta integración contextual de ${text}`);
assert(!view.includes('construirCapaTextual('),'el grafo principal no debe recibir la capa textual');
console.log('OK: 9A unidades y subunidades verificables, tag ≠ evidencia, arista original, FAQ u:, expansión reversible y persistencia.');
