// Pruebas herméticas del contexto: sin API externa ni pool de MariaDB.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLLMGateway} from '../../src/llm/gateway.js';
import {createSessionStore} from '../../src/llm/session.js';
import {makeIndex,searchIndex} from '../../public/labo/js/vectorial-engine.js';
const doc=(id,es,chapter,paragraph,relatedSubunits)=>({id,es,gr:'ἐνέργεια',chapter,paragraph,relatedSubunits,kind:paragraph==null?'subunidad':'parrafo',reference:id,title:id,staticTags:[],functionalTags:[]});
const docs=[doc('sub:A','felicidad actividad virtud',1,null,['A']),doc('sub:B','justicia distribución',1,null,['B']),
  doc('paragraph:1','Antecedente de la definición',1,1,[]),doc('paragraph:2','Texto de definición',1,2,['A']),
  doc('paragraph:3','Consecuencia de la definición',1,3,[]),doc('paragraph:4','Otro capítulo',2,4,[])];
const req=(cookie='',body={})=>({headers:{host:'localhost:3000',cookie},body,protocol:'http',get(k){return this.headers[k.toLowerCase()];}});
function res(){return {headers:{},data:null,statusCode:200,status(n){this.statusCode=n;return this;},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},set(k,v){return this.setHeader(k,v);},json(v){this.data=v;return this;},events:'',write(v){this.events+=v;},end(){this.writableEnded=true;},on(){}};}
function fixture(){let revision='rev1', now=0;const prompts=[],records=[];
  const gw=createLLMGateway({apiKey:'fake',model:'fake',sessions:createSessionStore({now:()=>now}),audit:{enabled:true,record:async e=>{records.push(e);return true;}},
    service:{obtener:async()=>({sourceHash:revision,lectura:{txt:'test'}})},editorialLoader:async()=>[],
    loadEngine:async()=>({parseBook(){},buildEvidenceDocuments(){return {documents:docs};},makeIndex,searchIndex}),
    fetchImpl:async (_url,opts)=>{const p=JSON.parse(opts.body);prompts.push(p);const answer='Explicación de prueba';
      if(p.stream)return {ok:true,body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({choices:[{delta:{content:answer},finish_reason:'stop'}]})}\n\ndata: [DONE]\n\n`));c.close();}})};
      return {ok:true,json:async()=>({choices:[{message:{content:answer},finish_reason:'stop'}]})};}});
  const open=async()=>{const r=res();await gw.session(req(),r);return r.headers['set-cookie'].split(';')[0];};
  const ask=async(cookie,id,question,extra={},stream=false)=>{const r=res();await gw[stream?'stream':'chat'](req(cookie,{requestId:`request_${id}`,question,revision,mode:'lectura',...extra}),r);return r;};
  return {open,ask,prompts,records,setRevision:r=>revision=r,advance:n=>now+=n};}
test('contexto: cita estable, párrafos vecinos, persistencia tras diez minutos y seguimiento sin términos',async()=>{
  const f=fixture(),cookie=await f.open();
  const a=await f.ask(cookie,'primera','felicidad actividad virtud',{sourceIds:['sub:A']});assert.equal(a.statusCode,200);
  const first=a.data.sources.find(s=>s.id==='sub:A');assert.equal(first.label,'E1');
  assert.deepEqual(a.data.sources.filter(s=>s.origin==='contexto').map(s=>s.id),['paragraph:1','paragraph:3']);
  f.advance(11*60*1000);
  const b=await f.ask(cookie,'segunda','¿Podés enumerar esas condiciones?',{historyIds:['request_primera']});assert.equal(b.statusCode,200);
  assert.equal(b.data.sources.find(s=>s.id==='sub:A').label,first.label);
  assert.match(f.prompts.at(-1).messages[1].content,/Pregunta anterior: felicidad actividad virtud/);
  assert.match(f.prompts.at(-1).messages[1].content,/\[E1\] sub:A/);
  assert.ok(f.records.at(-1).sources.some(s=>s.label==='E1'&&s.id==='sub:A'));
  const c=await f.ask(cookie,'tercera','justicia distribución',{sourceIds:['sub:B'],historyIds:['request_primera','request_segunda']},true);
  assert.match(c.events,/event: done/);assert.match(c.events,/"label":"E4"/);
  assert.match(f.prompts.at(-1).messages[1].content,/Pregunta anterior: ¿Podés enumerar esas condiciones\?/);
});
test('no se acepta historial de otra sesión ni de revisión anterior, ni se consume crédito',async()=>{
  const f=fixture(),a=await f.open(),b=await f.open();await f.ask(a,'primera','felicidad');
  const wrong=await f.ask(b,'segunda','felicidad',{historyIds:['request_primera']});assert.equal(wrong.statusCode,409);assert.equal(f.prompts.length,1);
  f.setRevision('rev2');const stale=await f.ask(a,'tercera','felicidad',{historyIds:['request_primera']});assert.equal(stale.statusCode,409);assert.equal(f.prompts.length,1);
  const next=await f.ask(b,'cuarta','felicidad');assert.equal(next.data.remaining,5);
});
test('una fuente anterior que no coincide léxicamente puede recuperarse en una repregunta',async()=>{
  const f=fixture(),cookie=await f.open();await f.ask(cookie,'primera','¿Qué es la felicidad?',{sourceIds:['sub:B']});
  const b=await f.ask(cookie,'segunda','¿Podés ampliar?',{historyIds:['request_primera']});assert.equal(b.statusCode,200);
  assert.equal(b.data.sources.find(s=>s.id==='sub:B').origin,'historial');assert.equal(b.data.sources.find(s=>s.id==='sub:B').label,'E1');
  assert.ok(b.data.sources.every(s=>s.id!=='paragraph:4'));
});
