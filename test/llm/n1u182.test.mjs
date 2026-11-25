import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createLLMGateway } from '../../src/llm/gateway.js';
import { createSessionStore } from '../../src/llm/session.js';
import { buildEditorialGraph,runGraphTool,loadEditorialGraph } from '../../src/llm/graph.js';
import { createLLMAudit } from '../../src/llm/audit.js';
import { makeIndex,searchIndex } from '../../public/labo/js/vectorial-engine.js';
import { renderLLMGraph } from '../../public/js/lab/llmGraphView.js';
import { AUDIT_MARKER } from '../../src/llm/sections.js';
const names=['n1u5-fichas-explicativas','n1u6-puentes-explicativos','n1u7-fichas-red-piloto'];
const files=await Promise.all(names.map(n=>readFile(new URL(`../../public/lab/${n}.json`,import.meta.url),'utf8').then(JSON.parse)));
const revision=files[0].fuente.revision;
const a='faq.lab.felicidad',b='faq.lab.ergon',c='faq.lab.alma',target='sub:1098a16-18';
const fichas=[...files[0].fichas,...files[2].fichas];
const ids=new Set([...fichas.flatMap(f=>[...(f.apoyos||[]),...(f.pasos||[])]),...files[1].puentes.flatMap(p=>p.apoyos)].map(p=>p.sub_id).filter(Boolean));
// Contenido sintético: IDs, aristas y apoyos del catálogo real, no una copia de MariaDB.
const docs=[...ids].map(id=>({id:'sub:'+id,es:id==='1102a5-7'?'felicidad actividad virtud':'texto de prueba '+id,gr:'ἐνέργεια',chapter:7,paragraph:null,relatedSubunits:[id],kind:'subunidad',reference:id,title:id,staticTags:[],functionalTags:[]}));
const index=makeIndex(docs),graph=buildEditorialGraph(files,revision,index);
const context={search:()=>[],addSource:d=>d,addFicha:()=>{}};
const tool=(name,args)=>runGraphTool(graph,name,args,context);
const call=(id,name,args)=>({id,type:'function',function:{name,arguments:JSON.stringify(args)}});
const response=(message,usage={prompt_tokens:100,completion_tokens:20})=>({ok:true,json:async()=>({model:'test-model',choices:[{message,finish_reason:message.tool_calls?'tool_calls':'stop'}],usage})});
const req=(cookie='',body={})=>({headers:{host:'localhost:3000',cookie},body,protocol:'http',get(k){return this.headers[k.toLowerCase()];}});
function res(){return {headers:{},data:null,statusCode:200,status(n){this.statusCode=n;return this;},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},set(k,v){return this.setHeader(k,v);},json(v){this.data=v;return this;},events:'',write(v){this.events+=v;},end(){this.writableEnded=true;},on(){}};}
const answer='Explicación [E1].\n'+AUDIT_MARKER+'\nEvaluación de prueba.';
function fixture({loader,respond,rateLimit=24}={}){const prompts=[],records=[];
  const gw=createLLMGateway({apiKey:'fake',model:'test-model',rateLimit,sessions:createSessionStore(),audit:{enabled:true,record:async e=>{records.push(e);return true;}},graphLoader:loader||asyncGraph,
    service:{obtener:async()=>({sourceHash:revision,lectura:{txt:'test'}})},editorialLoader:async()=>[],
    loadEngine:async()=>({parseBook(){},buildEvidenceDocuments(){return {documents:docs};},makeIndex,searchIndex}),
    fetchImpl:async (_url,opts)=>{const p=JSON.parse(opts.body);prompts.push(p);return respond?respond(p,prompts.length):response({content:answer});}});
  async function open(){const r=res();await gw.session(req(),r);return r.headers['set-cookie'].split(';')[0];}
  async function ask(cookie,id,extra={},stream=false){const r=res();await gw[stream?'stream':'chat'](req(cookie,{requestId:'request_'+id,question:'felicidad actividad virtud',revision,mode:'grafo',...extra}),r);return r;}
  return {gw,open,ask,prompts,records};
}
const asyncGraph=async(_dir,rev,idx)=>buildEditorialGraph(files,rev,idx);
test('grafo piloto real: 7 fichas, 8 relaciones dirigidas, apoyo central y caminos limitados',async()=>{
  assert.equal([...graph.nodes.values()].filter(n=>n.type==='ficha').length,7);
  assert.equal(graph.edges.filter(e=>e.type==='relacion').length,8);
  const f=tool('obtener_ficha',{id:a});assert.ok(f.nodes.some(n=>n.id===target));
  const direct=tool('explorar_subgrafo',{id:a,depth:1,direction:'saliente'});assert.ok(direct.nodes.some(n=>n.id===b));assert.ok(!direct.nodes.some(n=>n.id===c));
  const p=tool('buscar_caminos',{from:a,to:c});assert.ok(p.found);assert.equal(p.edges.length,2);
  assert.throws(()=>tool('explorar_subgrafo',{id:a,depth:4}));assert.throws(()=>tool('obtener_evidencia',{ids:['sub:inventado']}));
  assert.throws(()=>tool('sql',{query:'DROP TABLE x'}));assert.throws(()=>buildEditorialGraph(files,'otra',index));
const g = await loadEditorialGraph(
  fileURLToPath(new URL('../../public/', import.meta.url)),
  revision,
  index
);
assert.equal(g.edges.length, graph.edges.length);
});
test('dos rondas reales simuladas, evidencia nueva verificada, un crédito y traza persistible',async()=>{
  const f=fixture({respond:(p,n)=>{
    if(n===1)return response({tool_calls:[call('t1','obtener_ficha',{id:a}),call('t2','explorar_subgrafo',{id:a,depth:2})]});
    if(n===2){assert.equal(p.messages.filter(m=>m.role==='tool').length,2);assert.ok(p.messages.some(m=>m.role==='tool'&&m.content.includes(target)));return response({tool_calls:[call('t3','obtener_evidencia',{ids:[target]})]});}
    assert.equal(p.tools,undefined);assert.ok(p.messages[1].content.includes(target));assert.match(p.messages[1].content,/EXPLORACIÓN EDITORIAL REALIZADA/);return response({content:answer});
  }});
  const cookie=await f.open(),r=await f.ask(cookie,'graph');assert.equal(r.statusCode,200);assert.equal(r.data.remaining,5);assert.equal(f.prompts.length,3);
  assert.ok(r.data.sources.some(s=>s.id===target&&s.origin==='grafo'));assert.equal(r.data.graphTrace.steps.length,3);assert.ok(r.data.graphTrace.edges.some(e=>e.id==='red:r05'));
  assert.equal(r.data.usage.promptTokens,300);assert.equal(f.records.length,1);assert.deepEqual(f.records[0].graphTrace,r.data.graphTrace);
  assert.ok(!JSON.stringify(r.data.graphTrace).includes('texto de prueba'));
  const replay=await f.ask(cookie,'graph');assert.equal(replay.data.replay,true);assert.equal(f.prompts.length,3);
});
test('stream: eventos de exploración, fuentes actualizadas y evaluación separada',async()=>{
  const f=fixture({respond:(p,n)=>n===1?response({tool_calls:[call('t1','obtener_evidencia',{ids:[target]})]}):n===2?response({content:'suficiente'}):{ok:true,body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({model:'test-model',choices:[{delta:{content:answer},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:20}})}\n\ndata: [DONE]\n\n`));c.close();}})}});
  const r=await f.ask(await f.open(),'stream',{},true);assert.match(r.events,/event: graph/);assert.match(r.events,/event: meta/);assert.doesNotMatch(r.events,/event: audit_delta/);assert.match(r.events,/event: done/);assert.match(r.events,/"remaining":5/);assert.equal(f.records.length,1);
});
test('rechaza operaciones desconocidas, no finge consultas; lectura ordinaria no usa herramientas',async()=>{
  const f=fixture({respond:(p,n)=>n===1?response({tool_calls:[call('x','sql',{query:'DROP TABLE x'})]}):n===2?response({content:'sin más'}):response({content:answer})});
  const cookie=await f.open(),r=await f.ask(cookie,'bad');assert.equal(r.data.graphTrace.state,'sin_consultas_validas');assert.equal(r.data.graphTrace.steps[0].ok,false);assert.deepEqual(r.data.graphTrace.steps[0].args,{});
  const plain=await f.ask(cookie,'plain',{mode:'lectura'});assert.equal(plain.data.graphTrace,null);assert.equal(f.prompts.length,4);assert.equal(f.prompts.at(-1).tools,undefined);
});
test('revisión incompatible o presupuesto de proveedor agotado no consume crédito',async()=>{
  const f=fixture({loader:async()=>{throw Error('stale');}});const cookie=await f.open();const r=await f.ask(cookie,'stale');assert.equal(r.statusCode,409);assert.equal(f.prompts.length,0);const s=res();await f.gw.session(req(cookie),s);assert.equal(s.data.remaining,6);
  const g=fixture({rateLimit:1,respond:()=>response({tool_calls:[call('x','obtener_ficha',{id:a})]})});const ck=await g.open();const bad=await g.ask(ck,'rate');assert.equal(bad.statusCode,429);assert.equal(g.prompts.length,1);const t=res();await g.gw.session(req(ck),t);assert.equal(t.data.remaining,6);
});
test('auditoría parametrizada en grafo_json y SVG de relaciones con escape',async()=>{
  const calls=[],db={query:async(sql,params)=>calls.push({sql,params})};const audit=createLLMAudit({enabled:true,db});
  const trace={state:'consultado',providerCalls:2,steps:[{tool:'buscar_nodos',args:{query:'<script>'},ok:true}],nodes:[{id:a,type:'ficha',title:'<script>',url:'/#/fichas/felicidad'},{id:b,type:'ficha',title:'Érgon',url:'javascript:alert(1)'}],edges:[{from:a,to:b,label:'pide una determinación',estado:'propuesta'}]};
  await audit.record({graphTrace:trace});assert.match(calls[0].sql,/grafo_json/);assert.deepEqual(JSON.parse(calls[0].params.at(-1)),trace);assert.equal(calls[0].params.length,19);
  await audit.record({});assert.doesNotMatch(calls[1].sql,/grafo_json/);assert.equal(calls[1].params.length,18);
  const html=renderLLMGraph(trace);assert.match(html,/<svg/);assert.match(html,/#\/fichas\/felicidad/);assert.doesNotMatch(html,/<script>|javascript:/);assert.match(html,/&lt;script&gt;/);
});

test('lote excesivo: conserva tres llamadas válidas y redacta sin otra ronda de herramientas',async()=>{
  const f=fixture({respond:(p,n)=>{
    if(n===1)return response({tool_calls:[call('1','obtener_ficha',{id:a}),call('2','explorar_subgrafo',{id:a,depth:1}),call('3','obtener_evidencia',{ids:[target]}),call('4','obtener_ficha',{id:b})]});
    assert.equal(p.tools,undefined);assert.match(p.messages[1].content,/1098a16-18/);return response({content:answer});
  }});
  const r=await f.ask(await f.open(),'excess');assert.equal(r.statusCode,200);assert.equal(r.data.remaining,5);assert.equal(f.prompts.length,2);
  assert.equal(r.data.graphTrace.state,'parcial');assert.equal(r.data.graphTrace.steps.length,3);assert.ok(r.data.sources.some(s=>s.id===target));
  assert.deepEqual(r.data.graphTrace.planningIssues,[{round:1,reason:'lote_limitado',received:4,accepted:3,malformed:0,duplicates:0,overLimit:1}]);
  assert.equal(f.records[0].status,'ok');assert.equal(f.records[0].graphTrace.state,'parcial');assert.match(renderLLMGraph(r.data.graphTrace),/Exploración limitada/);
});
test('segunda ronda malformada: conserva la primera, no reenvía lote incompleto y transmite respuesta final',async()=>{
  const f=fixture({respond:(p,n)=>{
    if(n===1)return response({tool_calls:[call('a1','obtener_evidencia',{ids:[target]})]});
    if(n===2)return response({tool_calls:[null,call('b1','buscar_nodos',{query:'felicidad'}),call('b1','obtener_ficha',{id:a}),{id:'b2',type:'function',function:{name:'buscar_nodos',arguments:{query:'felicidad'}}}]});
    assert.equal(p.tools,undefined);assert.ok(p.stream);assert.equal(p.messages.length,2);
    return {ok:true,body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({model:'test-model',choices:[{delta:{content:answer},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:20}})}\n\ndata: [DONE]\n\n`));c.close();}})};
  }});
  const r=await f.ask(await f.open(),'malformed',{},true);assert.equal(f.prompts.length,3);assert.match(r.events,/event: done/);assert.match(r.events,/"remaining":5/);assert.match(r.events,/event: delta/);assert.doesNotMatch(r.events,/event: error/);
  const trace=f.records[0].graphTrace;assert.equal(trace.state,'parcial');assert.equal(trace.steps.length,2);assert.equal(trace.planningIssues[0].malformed,2);assert.equal(trace.planningIssues[0].duplicates,1);assert.ok(f.records[0].sources.some(s=>s.id===target));
});
test('ninguna llamada válida: usa fuentes iniciales y registra diagnóstico sin datos crudos',async()=>{
  const f=fixture({respond:(p,n)=>n===1?response({tool_calls:[null,{id:'x',type:'other',function:{name:'unknown',arguments:'secreto simulado'}}]}):response({content:answer})});
  const r=await f.ask(await f.open(),'none');assert.equal(r.statusCode,200);assert.equal(r.data.graphTrace.steps.length,0);assert.equal(r.data.graphTrace.state,'parcial');assert.equal(r.data.remaining,5);assert.equal(f.prompts.length,2);assert.ok(r.data.sources.length);assert.doesNotMatch(JSON.stringify(r.data.graphTrace),/secreto simulado/);
});
test('lote limitado sin recuperación inicial: usa apoyos realmente descubiertos o no cobra si faltan',async()=>{
  const f=fixture({respond:(p,n)=>n===1?response({tool_calls:[null,call('s','obtener_ficha',{id:a})]}):response({content:answer})});
  const r=await f.ask(await f.open(),'fallback',{question:'zzzzzzz'});assert.equal(r.statusCode,200);assert.equal(r.data.graphTrace.state,'parcial');assert.ok(r.data.graphTrace.fallbackSourceIds.length);assert.ok(r.data.sources.every(s=>s.origin==='grafo'));assert.equal(r.data.remaining,5);
  const g=fixture({respond:()=>response({tool_calls:[null]})});const bad=await g.ask(await g.open(),'no_evidence',{question:'zzzzzzz'});assert.equal(bad.statusCode,422);assert.equal(g.prompts.length,1);assert.equal(g.records[0].graphTrace.state,'interrumpido');
});
