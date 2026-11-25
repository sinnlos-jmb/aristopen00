import assert from 'node:assert/strict';
import { test } from 'node:test';
import { desafios,iniciarEsfinge,responderEsfinge,resultadoEsfinge,retrocederEsfinge } from '../js/lab/esfinge.js';
import { expandGraph,pruneRoots } from '../js/lab/graphExpansion.js';
const graph={nodes:['a','b','c','d','e','f'].map(id=>({id,title:id})),edges:[['a','b'],['b','c'],['c','d'],['d','e'],['e','f'],['d','b']].map(([from,to],i)=>({id:'r'+i,from,to}))};
const base={nodes:graph.nodes.slice(0,2),edges:graph.edges.slice(0,1)};
for(const d of desafios){
  test(`${d.id}: refutación solo con tesis y todas las premisas admitidas`,()=>{
    for(const a of ['si','no','duda'])for(const b of ['si','no','duda'])for(const c of ['si','no','duda']){
      let s=responderEsfinge(iniciarEsfinge(d.id),a);
      if(a!=='si'){assert.equal(resultadoEsfinge(s).estado,'tesis_no_asumida');continue;}
      s=responderEsfinge(s,b);assert.equal(resultadoEsfinge(s),null);s=responderEsfinge(s,c);
      assert.equal(resultadoEsfinge(s).estado,b==='si'&&c==='si'?'refutacion':'sin_refutacion');
      assert.equal(resultadoEsfinge(retrocederEsfinge(s)),null);
      assert.throws(()=>responderEsfinge(s,'si'));
    }
  });
}
test('expansión bidireccional: dos generaciones, preservación de aristas originales y dirección',()=>{
  const g=expandGraph(base,graph,new Set(['a']));assert.deepEqual(g.nodes.map(x=>x.id).sort(),['a','b','c','d']);assert.ok(g.edges.every(e=>graph.edges.includes(e)));assert.ok(!g.nodes.some(x=>x.id==='e'));assert.deepEqual(expandGraph(base,graph,new Set()),base);
});
test('ramas compartidas y poda al colapsar: conserva lo que aún es alcanzable',()=>{
  const g=expandGraph(base,graph,new Set(['a','d']));assert.ok(g.nodes.some(x=>x.id==='f'));assert.deepEqual([...pruneRoots(base,graph,new Set(['d']))],[]);assert.deepEqual([...pruneRoots(base,graph,new Set(['b','d']))].sort(),['b','d']);assert.deepEqual(expandGraph(base,graph,new Set(['b'])).nodes.map(x=>x.id).sort(),['a','b','c','d','e']);
});
test('no inventa nodos de raíces inexistentes y no modifica entradas',()=>{
  const before=JSON.stringify({base,graph});assert.deepEqual(expandGraph(base,graph,new Set(['x'])),base);assert.equal(JSON.stringify({base,graph}),before);
});

import { renderLLMGraph,hydrateLLMGraphs } from '../js/lab/llmGraphView.js';
import { createLabEsfingeView } from '../js/views/labEsfingeView.js';
const originalTrace={state:'consulta_local',nodes:[{id:'a',type:'ficha',title:'Felicidad',url:'/#/fichas/felicidad'},{id:'b',type:'ficha',title:'Érgon',url:'/#/fichas/ergon'}],edges:[{id:'r0',from:'a',to:'b',label:'relación'}],paths:[{ids:['a','b'],edgeIds:['r0']}]};
test('la ampliación local no altera el recorrido original ni se incorpora a trazas de la LLM',()=>{
  const local=renderLLMGraph(originalTrace,graph);assert.match(local,/Caminos encontrados \(1\)/);assert.match(local,/2 fichas · 1 relación/);assert.match(local,/dos aristas/);
  assert.match(local,/&quot;catalog&quot;:\{/);assert.match(renderLLMGraph({...originalTrace,state:'consultado'},graph),/&quot;catalog&quot;:null/);
});
test('hidratación simulada: conserva posiciones al expandir/colapsar y abre modal sin navegar',async()=>{
  const stub=()=>({hidden:false,textContent:'',disabled:false,innerHTML:'',open:false,addEventListener(){},removeEventListener(){},replaceChildren(){},appendChild(){},setAttribute(){},showModal(){this.open=true;},remove(){this.open=false;}});
  const prev={document:globalThis.document,window:globalThis.window,getComputedStyle:globalThis.getComputedStyle};
  const controls=stub(),expand=stub(),reset=stub(),count=stub(),host=stub(),fallback=stub(),selection=stub();let dialog;
  controls.querySelector=s=>({'[data-lq-expand]':expand,'[data-lq-reset]':reset,'.lq-cy-count':count}[s]);
  const panel={...stub(),isConnected:true,appendChild(n){dialog=n;},dataset:{lqCy:JSON.stringify({...base,nodes:originalTrace.nodes.map(n=>({...n,preview:{introduccion:['Texto editorial'],estado:'borrador'}})),catalog:{...graph,nodes:[...originalTrace.nodes,...graph.nodes.slice(2)]}})},querySelector:s=>({'.lq-cy-host':host,'.lq-graph-scroll':fallback,'.lq-cy-selection':selection,'.lq-cy-controls':controls}[s])};
  const root={querySelectorAll:()=>[panel]};panel.parentElement=root;
  const handlers=new Map(),displayed=new Map();let destroyed=false,layouts=0;
  const sty={selector(){return this;},style(){return this;},update(){return this;}};
  const add=x=>{for(const e of Array.isArray(x)?x:[x]){const v={...e,pos:e.position||{x:0,y:0},id:()=>e.data.id,position(){return this.pos;}};displayed.set(e.data.id,v);}};
  const cy={on(name,type,fn){handlers.set(name+type,fn);},style:()=>sty,batch:fn=>fn(),nodes:()=>[...displayed.values()].filter(e=>!e.data.source),elements:()=>({filter:fn=>({remove(){for(const e of displayed.values())if(fn(e))displayed.delete(e.id());}})}),getElementById:id=>displayed.has(id)?Object.assign(displayed.get(id),{length:1}):{length:0},add,layout:()=>({run(){layouts++;}}),destroy(){destroyed=true;},resize(){}};
  globalThis.document={createTextNode:s=>s,createElement:()=>stub()};globalThis.window={location:{hash:'#/lab/consultas'}};globalThis.getComputedStyle=()=>({color:'#333',getPropertyValue:()=>18});
  let dispose;
  try{
    dispose=hydrateLLMGraphs(root,async()=>opts=>{add(opts.elements);return cy;});await Promise.resolve();await Promise.resolve();
    assert.equal(fallback.hidden,true);const tap=()=>handlers.get('tapnode')({target:{data:()=>({id:'a',label:'Felicidad',url:'/#/fichas/felicidad'})}});
    displayed.get('a').pos={x:321,y:456};
    tap();tap();assert.equal(window.location.hash,'#/lab/consultas');assert.equal(cy.nodes().length,4);assert.match(count.textContent,/4 fichas/);assert.ok(cy.nodes().some(n=>n.classes==='lq-expanded'));assert.deepEqual(displayed.get('a').pos,{x:321,y:456});
    displayed.get('c').pos={x:654,y:789};tap();tap();assert.equal(cy.nodes().length,2);tap();tap();assert.deepEqual(displayed.get('c').pos,{x:654,y:789});assert.equal(layouts,0);
    tap();await new Promise(r=>setTimeout(r,380));assert.equal(window.location.hash,'#/lab/consultas');assert.equal(dialog.open,true);assert.match(dialog.innerHTML,/Texto editorial/);assert.match(dialog.innerHTML,/target="_blank"/);
    tap();dispose();assert.equal(destroyed,true);assert.equal(dialog.open,false);await new Promise(r=>setTimeout(r,380));assert.equal(dialog.open,false);
  }finally{dispose?.();Object.assign(globalThis,prev);}
});
test('vista Esfinge simulada: inicia, conserva las respuestas, muestra refutación y permite retroceder',()=>{
  const prev=globalThis.document;let click;
  const el={innerHTML:'',style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>null,contains:()=>true,addEventListener:(event,fn)=>{click=fn;},removeEventListener(){}};
  globalThis.document={createElement:()=>el,querySelector:()=>({})};
  try{const v=createLabEsfingeView();assert.match(el.innerHTML,/Elegí un desafío/);
    const press=(dataset,attrs=[])=>click({target:{closest:()=>({dataset,hasAttribute:k=>attrs.includes(k)})}});
    press({esfingeStart:'posesion'});assert.match(el.innerHTML,/mera posesión/);press({esfingeAnswer:'si'});press({esfingeAnswer:'si'});press({esfingeAnswer:'si'});assert.match(el.innerHTML,/Refutación de la tesis/);assert.match(el.innerHTML,/1100a3/);assert.match(el.innerHTML,/#\/grafos\/felicidad/);
    press({},['data-esfinge-back']);assert.doesNotMatch(el.innerHTML,/Refutación de la tesis/);press({esfingeAnswer:'duda'});assert.match(el.innerHTML,/No se obtuvo una refutación/);v.destroy();
  }finally{globalThis.document=prev;}
});
