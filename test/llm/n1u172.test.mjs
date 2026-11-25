import test from 'node:test';
import assert from 'node:assert/strict';
import { readOpenRouterStream } from '../../src/llm/stream.js';
import { readAgoraLLMStream } from '../../public/js/lab/llmStream.js';
import { createLLMAudit } from '../../src/llm/audit.js';
import { createLLMGateway } from '../../src/llm/gateway.js';
import { createSessionStore } from '../../src/llm/session.js';
import { makeIndex, searchIndex } from '../../public/labo/js/vectorial-engine.js';

const encode = new TextEncoder();
function chunks(values){return new ReadableStream({start(c){for(const value of values)c.enqueue(encode.encode(value));c.close();}})}
const upstream = ({parts=[],finish='stop',model='nvidia/nemotron-3.5-super-vl:free',withDone=true,err=false}={})=>{
  const msgs=[`: OPENROUTER PROCESSING\n\n`,...parts.map(text=>`data: ${JSON.stringify({model,choices:[{delta:{content:text},finish_reason:null}]})}\n\n`)];
  if(err)msgs.push(`data: ${JSON.stringify({error:{code:500,message:'provider_error'},choices:[{delta:{content:''},finish_reason:'error'}]})}\n\n`);
  else msgs.push(`data: ${JSON.stringify({model,choices:[{delta:{content:''},finish_reason:finish}],usage:{prompt_tokens:100,completion_tokens:40}})}\n\n`);
  if(withDone)msgs.push('data: [DONE]\n\n');
  return {ok:true,body:chunks(msgs)};
};
const req=(cookie='',body={})=>({headers:{host:'localhost:3000',cookie},body,protocol:'http',
  get(k){return this.headers[k.toLowerCase()];}});
function response(){const listeners={};return {headers:{},events:'',statusCode:200,data:null,writableEnded:false,
  status(n){this.statusCode=n;return this;},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},
  set(k,v){this.headers[k.toLowerCase()]=v;return this;},json(v){this.data=v;return this;},
  write(v){this.events+=v;return true;},end(){this.writableEnded=true;},
  on(name,fn){listeners[name]=fn;},close(){listeners.close?.();}};}
const docs=[{id:'sub:1098a',kind:'subunidad',reference:'1098a',title:'Felicidad',
  es:'La felicidad es una actividad del alma de acuerdo con la virtud.',gr:'εὐδαιμονία ἐνέργεια ψυχῆς',
  intro:'',unit:'I',relatedSubunits:['1098a'],staticTags:['arete'],functionalTags:['definicion'],tagOrigin:'directa'}];
function gatewayFixture({fetchImpl=async()=>upstream({parts:['Actividad ','y virtud.']}),audit=createLLMAudit({enabled:false}),limit=6}={}){
  const engine={parseBook(){},buildEvidenceDocuments(){return {documents:docs}},makeIndex,searchIndex};
  return createLLMGateway({fetchImpl,apiKey:'fake',model:'nvidia/nemotron-3.5-super-vl:free',
    service:{obtener:async()=>({sourceHash:'rev1',lectura:{txt:'Libro I',tags:{}}})},
    loadEngine:async()=>engine,editorialLoader:async()=>[],sessions:createSessionStore({limit}),audit});
}
const input=i=>({question:`¿La felicidad y la actividad? ${i}`,mode:'lectura',requestId:`request_n1u172_${i}abcdef`,revision:'rev1'});
const setup=async(gw)=>{const r=response();await gw.session(req(),r);return r.headers['set-cookie'].split(';')[0];};
function parseServerSSE(text){return text.split('\n\n').filter(Boolean).map(section=>{
  const lines=section.split('\n');const event=lines.find(s=>s.startsWith('event: '))?.slice(7);
  const data=lines.find(s=>s.startsWith('data: '))?.slice(6);
  return {event,data:data?JSON.parse(data):null};
});}

test('lector OpenRouter: varios fragmentos, comentarios y metadatos',async()=>{
  const deltas=[];const r=await readOpenRouterStream(upstream({parts:['La feli','cidad es actividad.']}),{onDelta:t=>deltas.push(t)});
  assert.equal(r.answer,'La felicidad es actividad.');assert.equal(r.finishReason,'stop');
  assert.equal(r.usage.completionTokens,40);assert.equal(deltas.length,2);
});
test('lector OpenRouter: fin por longitud se marca incompleto y no se interpreta reasoning',async()=>{
  const r=await readOpenRouterStream(upstream({parts:['Respuesta parcial'],finish:'length'}));
  assert.equal(r.incomplete,true);
  await assert.rejects(()=>readOpenRouterStream(upstream({parts:['Parte'],err:true})),/interrumpió/);
});
test('lector del navegador: SSE fragmentado con meta, delta y done',async()=>{
  const s='event: meta\ndata: {"sources":[]}\n\nevent: delta\ndata: {"text":"Hola"}\n\nevent: done\ndata: {"answer":"Hola"}\n\n';
  const parts=[s.slice(0,17),s.slice(17,41),s.slice(41)];const events=[];
  await readAgoraLLMStream(new Response(chunks(parts),{headers:{'Content-Type':'text/event-stream'}}),(kind,data)=>events.push({kind,data}));
  assert.deepEqual(events.map(x=>x.kind),['meta','delta','done']);
});
test('auditoría con consultas parametrizadas y sin claves/cookies/fragmentos de pasajes',async()=>{
  const calls=[],db={query:async(sql,params)=>{calls.push({sql,params});return {affectedRows:1};}};
  const audit=createLLMAudit({enabled:true,db});
  assert.equal(await audit.record({requestId:'abc-123',sessionHash:'f'.repeat(64),mode:'lectura',question:'¿Felicidad?',
    answer:'Actividad [E1]',status:'ok',sources:[{id:'sub:1098a',reference:'1098a'}],fichas:['faq.lab.felicidad']}),true);
  assert.equal(calls.length,1);assert.equal((calls[0].sql.match(/\?/g)||[]).length,18);
  assert.equal(calls[0].params[3],'¿Felicidad?');
  assert.ok(!calls[0].sql.includes('¿Felicidad?'));
});
test('cuatro generaciones streaming conservan cupo, entregan respuesta final y registran 4 filas',async()=>{
  const calls=[],db={query:async(_sql,p)=>{calls.push(p);}};
  const gateway=gatewayFixture({audit:createLLMAudit({enabled:true,db})});
  const cookie=await setup(gateway);
  for(let i=0;i<4;i++){
    const res=response();await gateway.stream(req(cookie,input(i)),res);
    const events=parseServerSSE(res.events);
    assert.deepEqual(events.map(x=>x.event),['meta','delta','delta','done']);
    assert.equal(events.at(-1).data.remaining,5-i);
    assert.equal(events.at(-1).data.answer,'Actividad y virtud.');
    assert.equal(events.at(-1).data.auditStored,true);
  }
  assert.equal(calls.length,4);
  assert.ok(calls.every(p=>p[5]==='ok'));
  assert.ok(calls.every(p=>p[1].length===64));
  assert.ok(calls.every(p=>!JSON.stringify(p).includes('fake')));
});
test('fallo del proveedor: no descuenta cupo y registra error/fragmento parcial',async()=>{
  const calls=[],db={query:async(_sql,p)=>{calls.push(p);}};
  const gateway=gatewayFixture({fetchImpl:async()=>upstream({parts:['Frase inicial'],err:true}),audit:createLLMAudit({enabled:true,db})});
  const cookie=await setup(gateway),res=response();
  await gateway.stream(req(cookie,input('failed')),res);
  const events=parseServerSSE(res.events);
  assert.equal(events.at(-1).event,'error');assert.equal(events.at(-1).data.remaining,6);
  assert.equal(calls.length,1);assert.equal(calls[0][5],'parcial');
  assert.equal(calls[0][4],'Frase inicial');
});
