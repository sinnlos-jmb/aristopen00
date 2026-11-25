// Simulación de interfaz: no utiliza API, navegador ni MariaDB real.
import assert from 'node:assert/strict';
import {createLabConsultaView} from '../js/views/labConsultaView.js';
import {compileCypher} from '../js/lab/queryMultimodal.js';
const handlers=new Map(),styles=new Map(),storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const query="MATCH p = (f:Ficha)-[*1..3]->(g:Ficha) WHERE f.id = 'faq.lab.felicidad' RETURN p";
let mode='lectura',typed='',example='';
const bind=(key,dataset={})=>({dataset,addEventListener(_e,fn){handlers.set(key,fn);}});
const content={innerHTML:'',className:'',dataset:{},style:{setProperty:(k,v)=>styles.set(k,v)},
 querySelectorAll(selector){
  if(selector==='[data-mode]')return [...this.innerHTML.matchAll(/data-mode="([^"]+)"/g)].map(([,m])=>bind('mode:'+m,{mode:m}));
  if(selector==='[data-use-query]')return [...this.innerHTML.matchAll(/data-use-query="([^"]+)"/g)].map(([,m])=>bind('use:'+m,{useQuery:m}));
  if(selector==='[data-reader-font-step]')return [bind('font:-2',{readerFontStep:'-2'}),bind('font:2',{readerFontStep:'2'})];return [];
 },querySelector(selector){
  if(selector==='#lq-form'&&this.innerHTML.includes('id="lq-form"'))return {...bind('execute'),elements:{cypher: this.innerHTML.includes('name="cypher"')?{value:query}:undefined}};
  if(selector==='#lq-llm-form'&&this.innerHTML.includes('id="lq-llm-form"'))return {...bind('submit'),elements:{llmQuestion:{value:typed},llmMode:{value:mode},llmExample:{value:example}}};
  if(selector==='[data-cypher-tutor]'&&this.innerHTML.includes('data-cypher-tutor'))return bind('tutor');
  if(selector==='#lq-llm-form select[name=llmMode]'&&this.innerHTML.includes('id="lq-llm-form"'))return bind('selectMode');
  return null;
 }};
globalThis.document={head:{appendChild(){}},querySelector(){return null;},createElement(n){return n==='div'?content:{dataset:{}};},dispatchEvent(){}};
const sub={id:'1098a16-18',titulo:'Actividad',es_ancla:{inicio:'La felicidad',fin:'virtud'},gr_ancla:{inicio:'εὐδαιμονία',fin:'ἀρετή'},conceptos_clave:['arete'],movimientos:['definicion']};
const reading={revision:'rev-test',tags:{unidades:[{id:'I.7',titulo:'Felicidad',subunidades:[sub]}]}};
const text='7\n{"parrafo_nro":1}\nLa felicidad es actividad conforme a la virtud.\nἡ εὐδαιμονία ἐνέργεια ἀρετή\n';
const f5={fuente:{revision:'rev-test'},fichas:[]},f6={fuente:{revision:'rev-test'},puentes:[]},f7={fuente:{revision:'rev-test'},fichas:[{id:'faq.lab.felicidad',titulo:'Felicidad',apoyos:[{sub_id:sub.id}]},{id:'faq.lab.ergon',titulo:'Érgon',apoyos:[{sub_id:sub.id}]}],red:{relaciones:[{id:'r',desde:'faq.lab.felicidad',hacia:'faq.lab.ergon',nombre:'pide una determinación'}]}};
const json=value=>({ok:true,json:async()=>value});let calls=0;
globalThis.fetch=async(url,opts={})=>{
 if(url==='/api/labo/lectura')return json(reading);
 if(url==='/api/texto/EN_libro1_v8.txt')return {ok:true,text:async()=>text};
 if(url.includes('n1u5-'))return json(f5);if(url.includes('n1u6-'))return json(f6);if(url.includes('n1u7-'))return json(f7);
 if(url==='/api/llm/session')return json({configured:true,remaining:6-calls,pending:0,limit:6,model:'fake',auditEnabled:true});
 if(url==='/api/llm/chat/stream'){
  calls++;const body=JSON.parse(opts.body);assert.equal(body.mode,'cypher');assert.match(body.question,/Ejemplo de intención: felicidad a tres aristas/);assert.deepEqual(body.sourceIds,[]);
  const events=[['delta',{text:'Probá este recorrido.'}],['audit_delta',{text:'EVALUACIÓN NO VISIBLE'}],['done',{answer:'Probá este recorrido.',queries:{accepted:[{query,ast:compileCypher(query)}],rejected:[]},model:'fake',remaining:5,used:1,pending:0,sources:[],fichas:[],promptVersion:'agora.llm.prompt.v5'}]];
  return new Response(events.map(([e,p])=>`event: ${e}\ndata: ${JSON.stringify(p)}\n\n`).join(''),{headers:{'Content-Type':'text/event-stream'}});
 }
 return {ok:false,status:404};
};
const view=createLabConsultaView({});const tick=()=>new Promise(r=>setTimeout(r,15));await tick();
assert.equal(styles.get('--agora-reader-font-size'),'18px');handlers.get('font:2')();assert.equal(styles.get('--agora-reader-font-size'),'20px');
handlers.get('mode:cypher')();assert.match(content.innerHTML,/Aprender Cypher/);handlers.get('tutor')();mode='cypher';await tick();assert.match(content.innerHTML,/name="llmExample"/);assert.match(content.innerHTML,/#\/chat/);assert.match(content.innerHTML,/#\/grafos/);
typed='Encontrar conexiones';example='felicidad a tres aristas';handlers.get('submit')({preventDefault(){}});await tick();assert.match(content.innerHTML,/Consultas comprobadas/);assert.doesNotMatch(content.innerHTML,/EVALUACIÓN NO VISIBLE/);assert.equal(calls,1);
handlers.get('use:0:0')();assert.match(content.innerHTML,/name="cypher"/);assert.match(content.innerHTML,/MATCH p =/);assert.equal(calls,1);
handlers.get('execute')({preventDefault(){}});assert.match(content.innerHTML,/Grafo de la consulta local/);assert.match(content.innerHTML,/#\/grafos\/felicidad/);assert.equal(calls,1);view.destroy();
console.log('N1-U.18.3 UI OK: tipografía compartida, tutor, intención, carga de consulta y grafo local sin llamada adicional.');
