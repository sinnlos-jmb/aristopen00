import assert from 'node:assert/strict';
import { indexarGrafo, crearEstadoFocal, obtenerSubgrafoFocal, alternarExpansion, restaurarBaseFocal } from '../js/lab/graphFocusExpansion.js';
import { caminoDesdeFocos, incorporarConservados, ocultarNodos, normalizarIds } from '../js/lab/graphNodeVisibility.js';
import { agruparFaqs, idGrupoFaq } from '../js/lab/graphFaqGrouping.js';
import { normalizarDisposicion, decorarAristasFocales, guardarDisposicion, leerDisposicion } from '../js/lab/graphLayoutPersistence.js';
const n = (id, tipo = 'concepto_estatico') => ({ group: 'nodes', data: { id, tipo, label: id } });
const a = (id, source, target, tipo = 'arista_funcional') => ({ group: 'edges', data: { id, source, target, tipo, fuente: 'corpus' } });
const foco = 'concepto_estatico:arete', otro = 'concepto_estatico:eudaimonia';
const corpus = [n(foco), n(otro), n('b'), n('c'), n('d'), n('x'), n('faq:1','faq'), n('faq:2','faq'), n('faq:3','faq'),
  a('ab',foco,'b'), a('bc','b','c'), a('cd','c','d'), a('ox',otro,'x'), a('xd','x','d'),
  a('f1','faq:1',foco,'foco_faq'), a('f2','faq:2',foco,'foco_faq'),
  a('f3','faq:2',otro,'foco_faq'), a('f4','faq:3',otro,'foco_faq')];
const idx=indexarGrafo(corpus), focos=[foco,otro];
let state=crearEstadoFocal(idx,focos);
let base=obtenerSubgrafoFocal(state);
assert(!base.nodos.has('d'));
const ruta=caminoDesdeFocos(idx,focos,'d');
assert(ruta && ruta.nodos.at(-1)==='d');
assert.equal(ruta.aristas.length,2); // pasa por x → d (camino mínimo desde eudaimonia)
const p=incorporarConservados(base.elementos,idx,focos,['d']);
assert(p.elementos.some(x=>x.data.id==='d'));
assert(p.elementos.some(x=>x.data.id==='xd'));
assert(!p.elementos.some(x=>x.data.id==='bc'));
state=alternarExpansion(state,'b');
assert(obtenerSubgrafoFocal(state).nodos.has('c'));
state=restaurarBaseFocal(state);
assert(!obtenerSubgrafoFocal(state).nodos.has('c'));
assert(incorporarConservados(obtenerSubgrafoFocal(state).elementos,idx,focos,['d']).elementos.some(x=>x.data.id==='d'));
// Ocultar un intermediario puede revelar una ruta alternativa, siempre documental.
const alternative=caminoDesdeFocos(idx,focos,'d',['x']);
assert.deepEqual(alternative.aristas,['ab','bc','cd']);
assert.equal(caminoDesdeFocos(idx,focos,'d',['x','b']),null);
const hidden=ocultarNodos(p.elementos,['x',foco],focos);
assert(hidden.some(x=>x.data.id===foco));
assert(!hidden.some(x=>x.data.id==='x'||x.data.id==='xd'));
const gid=idGrupoFaq(foco);
const plegado=agruparFaqs(base.elementos,{focos});
assert(plegado.elementos.some(x=>x.data.id===gid));
assert(!plegado.elementos.some(x=>x.data.id==='f1'));
const abierto=agruparFaqs(base.elementos,{focos,expandidos:new Set([gid])});
assert(!abierto.elementos.some(x=>x.data.id==='f1'));
assert(abierto.elementos.some(x=>x.data.aristaOriginalId==='f1'&&x.data.source===gid&&x.data.target==='faq:1'));
assert(abierto.elementos.some(x=>x.data.id===`enlace:${gid}`&&x.data.source===foco));
assert(!abierto.elementos.some(x=>x.data.id==='f2'));
// La FAQ 2 es compartida: puede estar ligada a dos agrupadores distintos.
const otherGroup=idGrupoFaq(otro);
assert(abierto.elementos.some(x=>x.data.id===otherGroup));
assert(abierto.elementos.filter(x=>x.data.target==='faq:2').some(x=>x.data.source===gid));
const gruposOcultos=agruparFaqs(base.elementos,{focos,nodosOcultos:[gid]});
assert(!gruposOcultos.elementos.some(x=>x.data.id===gid));
assert(!gruposOcultos.elementos.some(x=>x.data.id==='faq:1'));
const faqOculta=agruparFaqs(base.elementos,{focos,nodosOcultos:['faq:1']});
assert(!faqOculta.elementos.some(x=>x.data.id==='faq:1'));
assert(!faqOculta.elementos.some(x=>x.data.id===gid)); // queda 1 FAQ, no se agrupa
assert(faqOculta.elementos.some(x=>x.data.id==='f2'));
const fijado=agruparFaqs(base.elementos,{focos,conservados:['faq:1']});
assert(fijado.elementos.some(x=>x.data.id==='faq:1'));
assert(fijado.elementos.some(x=>x.data.aristaOriginalId==='f1'&&x.data.source===gid));
assert.deepEqual(normalizarIds(['a','a',null,'b']),['a','b']);
const prefs=normalizarDisposicion({nodosOcultos:['b','b',foco],nodosConservados:['d'],titulos:{ab:'Condición'},faqExpandidas:[gid]});
assert.deepEqual(prefs.nodosOcultos,['b',foco]);
assert.deepEqual(prefs.nodosConservados,['d']);
let stored='';
const storage={getItem:()=>stored,setItem:(_,v)=>stored=v};
assert(guardarDisposicion(storage,'focos',prefs));
assert.deepEqual(leerDisposicion(storage,'focos').nodosConservados,['d']);
const decorated=decorarAristasFocales(p.elementos,focos,prefs);
assert.equal(decorated.find(x=>x.data.id==='ab').data.source,foco);
// La proyección de origen no se modifica nunca.
const edicion = decorarAristasFocales(abierto.elementos,focos,{etiquetas:['f1'],titulos:{f1:'Pregunta esencial'}});
assert.equal(edicion.find(x=>x.data.aristaOriginalId==='f1').data.nombreAristaVisible,'Pregunta esencial');
assert.equal(edicion.find(x=>x.data.id===`enlace:${gid}`).data.nombreAristaVisible,'');
assert(corpus.some(x=>x.data.id==='f1'&&x.data.source==='faq:1'));
console.log('OK: FAQ desde agrupador, rutas existentes, ocultación, fijación reversible, focos protegidos y persistencia C8A.');
