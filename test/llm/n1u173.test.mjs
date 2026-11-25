import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIT_MARKER, createSectionSplitter, splitSections } from '../../src/llm/sections.js';
import { createLLMGateway, LLM_PROMPT_VERSION } from '../../src/llm/gateway.js';
import { createSessionStore } from '../../src/llm/session.js';
import { createLLMAudit } from '../../src/llm/audit.js';
import { makeIndex, searchIndex } from '../../public/labo/js/vectorial-engine.js';

const read = 'La felicidad es una actividad del alma conforme a la virtud [E1].';
const report = 'Cobertura: E1 fue útil.\nRecuperación: buscar el contexto del argumento del érgon.\nFichas: ampliar el nexo virtud-actividad.\nCalidad: comprobar la inferencia.';
const whole = `${read}\n\n${AUDIT_MARKER}\n${report}`;
const docs=[{id:'sub:1098a',kind:'subunidad',reference:'1098a',title:'Felicidad',es:read,
  gr:'εὐδαιμονία ἐνέργεια ψυχῆς',intro:'',unit:'I',relatedSubunits:['1098a'],staticTags:['arete'],functionalTags:['definicion'],tagOrigin:'directa'}];
const req=(cookie='',body={})=>({headers:{host:'localhost:3000',cookie},body,protocol:'http',
  get(k){return this.headers[k.toLowerCase()];}});
function response(){return {headers:{},events:'',statusCode:200,data:null,writableEnded:false,
  status(n){this.statusCode=n;return this;},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},
  set(k,v){this.headers[k.toLowerCase()]=v;return this;},json(v){this.data=v;return this;},
  write(v){this.events+=v;return true;},end(){this.writableEnded=true;},on(){}};}
const encode=new TextEncoder();
const stream=parts=>({ok:true,body:new ReadableStream({start(c){
  for(const text of parts)c.enqueue(encode.encode(`data: ${JSON.stringify({model:'modelo-prueba',choices:[{delta:{content:text},finish_reason:null}]})}\n\n`));
  c.enqueue(encode.encode('data: {"model":"modelo-prueba","choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'));
  c.close();}})});
const input=(id='01')=>({question:'¿Qué relación hay entre felicidad y virtud?',mode:'lectura',requestId:`request_dual_${id}abc`,revision:'rev1'});
const fixture=({fetchImpl,audit=createLLMAudit({enabled:false})})=>createLLMGateway({
  apiKey:'fake-key',model:'modelo-prueba',fetchImpl,audit,sessions:createSessionStore(),
  service:{obtener:async()=>({sourceHash:'rev1',lectura:{txt:'Libro I',tags:{}}})},
  loadEngine:async()=>({parseBook(){},buildEvidenceDocuments(){return {documents:docs}},makeIndex,searchIndex}),
  editorialLoader:async()=>[{id:'faq.lab.felicidad',title:'Felicidad',estado:'borrador',introduccion:'La actividad importa.'}],
});
const start=async gateway=>{const r=response();await gateway.session(req(),r);return r.headers['set-cookie'].split(';')[0];};
const parseEvents=text=>text.split('\n\n').filter(Boolean).map(s=>{
  const kind=s.match(/^event:\s*(\w+)/m)?.[1];const data=s.match(/^data:\s*(.*)$/m)?.[1];
  return {kind,payload:data?JSON.parse(data):null};
});

test('separa con streaming incluso cuando el marcador se fragmenta y oculta la marca',()=>{
  const s=createSectionSplitter(), chunks=[read+'\n\n<<<AGORA_', 'AUDITORIA_', 'V2>>>\nCobertura: E1.', '\nFichas: revisar.'];
  let shown='',audited='';for(const chunk of chunks){const v=s.take(chunk);shown+=v.answerDelta;audited+=v.auditDelta;}
  const last=s.finish();shown+=last.answerDelta;
  assert.equal(last.answer,read);assert.equal(shown,read+'\n\n');
  assert.equal(last.editorialAudit,'Cobertura: E1.\nFichas: revisar.');
  assert.equal(last.auditMissing,false);assert.ok(!shown.includes('AGORA_AUDITORIA'));
});

test('sin marcador conserva la explicación y marca auditoría ausente',()=>{
  const parsed=splitSections('La felicidad exige actividad [E1].');
  assert.equal(parsed.answer,'La felicidad exige actividad [E1].');
  assert.equal(parsed.editorialAudit,'');assert.equal(parsed.auditMissing,true);
});

test('modo no streaming: usa la misma separación; prompt libre y fichas como orientación',async()=>{
  let prompt;
  const gateway=fixture({fetchImpl:async (_url,opts)=>{
    prompt=JSON.parse(opts.body);
    return {ok:true,json:async()=>({model:'modelo-prueba',choices:[{message:{content:whole},finish_reason:'stop'}]})};
  }});
  const cookie=await start(gateway),res=response();await gateway.chat(req(cookie,input('nonstream')),res);
  assert.equal(res.statusCode,200);assert.equal(res.data.answer,read);
  assert.equal(res.data.editorialAudit,undefined);assert.equal(res.data.auditMissing,undefined);
  assert.equal(res.data.remaining,5);assert.equal(res.data.promptVersion,LLM_PROMPT_VERSION);
  assert.equal(LLM_PROMPT_VERSION,'agora.llm.prompt.v6');
  assert.match(prompt.messages[0].content,/libertad explicativa/);
  assert.match(prompt.messages[0].content,/solo sirven como orientación pedagógica/);
  assert.match(prompt.messages[0].content,/AGORA_AUDITORIA_V2/);
  assert.ok(!prompt.messages[0].content.includes('Usá exclusivamente las fuentes'));
});

test('stream: eventos de respuesta y auditoría separados, con registro en columnas propias',async()=>{
  const calls=[],db={query:async(sql,params)=>{calls.push({sql,params});}};
  const gateway=fixture({fetchImpl:async()=>stream([whole.slice(0,38),whole.slice(38,78),whole.slice(78,85),whole.slice(85)]),
    audit:createLLMAudit({enabled:true,db})});
  const cookie=await start(gateway),res=response();await gateway.stream(req(cookie,input('stream')),res);
  const events=parseEvents(res.events);
  assert.equal(events.at(-1).kind,'done');assert.equal(events.at(-1).payload.remaining,5);
  assert.equal(events.at(-1).payload.answer,read);
  assert.equal(events.at(-1).payload.editorialAudit,undefined);
  assert.equal(events.at(-1).payload.auditMissing,undefined);
  assert.equal(events.at(-1).payload.auditStored,true);
  const answer=events.filter(e=>e.kind==='delta').map(e=>e.payload.text).join('');
  const audit=events.filter(e=>e.kind==='audit_delta').map(e=>e.payload.text).join('');
  assert.equal(answer.trim(),read);assert.equal(audit,'');assert.ok(!res.events.includes(report));
  assert.ok(!answer.includes('AUDITORIA_V2'));
  assert.equal(calls.length,1);
  assert.ok(calls[0].sql.includes('auditoria_llm'));
  assert.equal((calls[0].sql.match(/\?/g)||[]).length,18);
  assert.equal(calls[0].params[4],read);
  assert.equal(calls[0].params[16],report);
  assert.equal(calls[0].params[17],1);
  assert.ok(!JSON.stringify(calls).includes('fake-key'));
});

test('si el modelo omite la evaluación, la respuesta se entrega y la DB indica ausencia',async()=>{
  const calls=[],db={query:async(sql,params)=>{calls.push(params);}};
  const gateway=fixture({fetchImpl:async()=>stream(['Respuesta completa sin auditoría.']),
    audit:createLLMAudit({enabled:true,db})});
  const cookie=await start(gateway),res=response();await gateway.stream(req(cookie,input('missing')),res);
  const events=parseEvents(res.events),done=events.at(-1).payload;
  assert.equal(done.answer,'Respuesta completa sin auditoría.');
  assert.equal(done.auditMissing,undefined);assert.equal(done.editorialAudit,undefined);
  assert.equal(done.remaining,5);assert.equal(calls[0][16],'');assert.equal(calls[0][17],0);
});
