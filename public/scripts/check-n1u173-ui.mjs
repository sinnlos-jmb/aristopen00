// N1-U.17.3 · Comprobar 4 turnos y actualización visible (sin navegador ni MariaDB).
import assert from 'node:assert/strict';
import { createLabConsultaView } from '../js/views/labConsultaView.js';
const handlers=new Map();let typed='',mode='lectura',used=0;
const content={innerHTML:'',className:'',dataset:{},scrollTop:0,scrollHeight:900,
  querySelectorAll(selector){
    if(selector==='[data-mode]')return [...this.innerHTML.matchAll(/data-mode="([^"]+)"/g)].map(([,m])=>({dataset:{mode:m},addEventListener(_e,fn){handlers.set('mode:'+m,fn);}}));
    return [];
  },
  querySelector(selector){
    if(selector==='#lq-form')return this.innerHTML.includes('id="lq-form"')?{elements:{},addEventListener(){}}:null;
    if(selector==='#lq-llm-form')return this.innerHTML.includes('id="lq-llm-form"')?{elements:{llmQuestion:{value:typed},llmMode:{value:mode}},
      addEventListener(_e,fn){handlers.set('submit',fn);}}:null;
    if(selector==='.lq-conversation')return this.innerHTML.includes('lq-conversation')?{scrollTop:0,scrollHeight:1400}:null;
    if(selector.startsWith('[data-llm-answer='))return {textContent:''};
    return null;
  },
};
globalThis.document={head:{appendChild(){}},querySelector(){return null;},createElement(n){return n==='div'?content:{dataset:{}};}};
const json={revision:'rev-test',tags:{unidades:[{id:'I.7',titulo:'Felicidad',subunidades:[{
  id:'1098a16-20',titulo:'Actividad conforme a virtud',intro:'Actividad',
  es_ancla:{inicio:'La felicidad',fin:'virtud'},gr_ancla:{inicio:'εὐδαιμονία',fin:'ἀρετή'},
  conceptos_clave:['arete'],movimientos:['definicion'],
}]}]}};
const text='7\n{"parrafo_nro":1}\nLa felicidad es actividad del alma conforme a la virtud.\nἡ εὐδαιμονία ἐνέργεια ἀρετή\n';
const requestIds=[];
const stream=body=>{
  assert.deepEqual(body.historyIds,requestIds.slice(-5));
  assert.equal(body.history,undefined);requestIds.push(body.requestId);
  const seq=++used;
  assert.equal(body.mode,seq===1?'grafo':'lectura');
  const graphTrace=seq===1?{state:'consultado',providerCalls:2,steps:[{tool:'obtener_ficha',args:{id:'faq.lab.felicidad'},ok:true}],nodes:[{id:'faq.lab.felicidad',type:'ficha',title:'Felicidad',url:'/#/fichas/felicidad'}],edges:[]}:null;
  const answer=`Respuesta ${seq}: condiciones y actividad de la felicidad [E7].`;
  const editorialAudit=`Evaluación ${seq}: recuperar contexto del érgon; revisar fichas.`;
  const events=[['meta',{sources:[{id:'sub:1',label:'E7',origin:'historial',reference:'1098a',title:'Felicidad',es:'Actividad',gr:'ἐνέργεια'}],fichas:[],revision:'rev-test',promptVersion:'agora.llm.prompt.v2'}],
    ['delta',{text:answer.slice(0,25)}],['delta',{text:answer.slice(25)}],
    ['audit_delta',{text:editorialAudit.slice(0,22)}],['audit_delta',{text:editorialAudit.slice(22)}],
    ['done',{answer,editorialAudit,auditMissing:false,model:'nvidia/nemotron-3.5-super-vl:free',remaining:6-seq,used:seq,pending:0,
      sources:[{id:'sub:1',label:'E7',origin:'historial',reference:'1098a',title:'Felicidad',es:'Actividad',gr:'ἐνέργεια'}],fichas:[],promptVersion:'agora.llm.prompt.v2',auditStored:true}]];
  if(graphTrace){events.unshift(['graph',graphTrace]);events.at(-1)[1].graphTrace=graphTrace;}
  const raw=events.map(([event,p])=>`event: ${event}\ndata: ${JSON.stringify(p)}\n\n`).join('');
  return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(raw));controller.close();}}),
    {headers:{'Content-Type':'text/event-stream; charset=utf-8'}});
};
globalThis.fetch=async (url,opts={})=>{
  if(url==='/api/labo/lectura')return {ok:true,json:async()=>json};
  if(url==='/api/texto/EN_libro1_v8.txt')return {ok:true,text:async()=>text};
  if(url==='/api/llm/session')return {ok:true,json:async()=>({configured:true,remaining:6-used,limit:6,pending:0,model:'nvidia/nemotron-3.5-super-vl:free',auditEnabled:true})};
  if(url==='/api/llm/chat/stream')return stream(JSON.parse(opts.body));
  return {ok:false,status:404};
};
const view=createLabConsultaView({});
await new Promise(r=>setTimeout(r,15));
assert.ok(handlers.has('mode:llm'));
handlers.get('mode:llm')();await new Promise(r=>setTimeout(r,15));
for(let i=1;i<=4;i++){
  mode=i===1?'grafo':'lectura';
  typed=`Pregunta ${i}: ¿cuáles son las condiciones?`;
  assert.ok(handlers.has('submit'));
  handlers.get('submit')({preventDefault(){}});
  await new Promise(r=>setTimeout(r,15));
  assert.equal((content.innerHTML.match(/class="lq-user-bubble"/g)||[]).length,i,`Después de ${i} consultas deben aparecer ${i} preguntas`);
  assert.equal((content.innerHTML.match(/class="lq-answer"/g)||[]).length,i,`Después de ${i} consultas deben aparecer ${i} respuestas`);
  assert.match(content.innerHTML,new RegExp(`Respuesta ${i}: condiciones`));
  assert.doesNotMatch(content.innerHTML,/class="lq-editorial-audit"/);
  assert.doesNotMatch(content.innerHTML,new RegExp(`Evaluación ${i}: recuperar contexto`));
}
assert.equal(used,4);
assert.match(content.innerHTML,/Recorrido del grafo/);
assert.match(content.innerHTML,/Subgrafo de fichas/);
assert.doesNotMatch(content.innerHTML,/obtener_ficha/); // La traza técnica se conserva en MariaDB, no en la vista de lectura.
assert.match(content.innerHTML,/#\/fichas\/felicidad/);
assert.match(content.innerHTML,/2 de 6/);
assert.match(content.innerHTML,/Pregunta 1:/);
assert.match(content.innerHTML,/Pregunta 4:/);
assert.doesNotMatch(content.innerHTML,/Registro editorial confirmado/);
assert.match(content.innerHTML,/\[E7\] 1098a/);
view.destroy();
console.log('N1-U.18.2 UI OK: cuatro turnos, SSE, cupo, auditoría y recorrido del grafo.');
