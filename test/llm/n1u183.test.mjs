import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCypher,graphMatches,scopeFor} from '../../public/js/lab/queryMultimodal.js';
import {validateSuggestions} from '../../public/js/lab/cypherTutor.js';
import {exactReferences,containingParagraph} from '../../src/llm/references.js';
import {createLLMGateway} from '../../src/llm/gateway.js';
import {createSessionStore} from '../../src/llm/session.js';
import {AUDIT_MARKER} from '../../src/llm/sections.js';
import {makeIndex,searchIndex} from '../../public/labo/js/vectorial-engine.js';
const a='faq.lab.felicidad',b='faq.lab.ergon',c='faq.lab.alma',d='faq.lab.virtudes';
const sheets=new Map([a,b,c,d].map(id=>[id,{id,title:id,type:'ficha',supports:[id]}]));
const edges=[[a,b],[b,c],[c,d],[d,a]].map(([desde,hacia],i)=>({id:`r${i}`,desde,hacia}));
const query=(pattern='-[:RELACIONADA_CON*1..3]->',target='')=>`MATCH p = (f:Ficha)${pattern}(g:Ficha) WHERE f.id = '${a}'${target?` AND g.id = '${target}'`:''} RETURN p`;
const run=q=>graphMatches(compileCypher(q),edges,sheets);
test('recorrido dirigido, entrante y bidireccional; mínimo no es sinónimo de secuencia argumentativa',()=>{
  const outgoing=run(query());assert.deepEqual(outgoing.paths.map(p=>p.edges.length),[1,2,3]);
  assert.deepEqual(run(query('<-[:RELACIONADA_CON*1..1]-')).paths[0].ids,[a,d]);
  const both=run(query('-[*1..3]-',d));assert.deepEqual(both.paths.map(p=>p.edges.length),[1,3]);
  assert.deepEqual(run(query('-[*1..3]->',d)).paths[0].ids,[a,b,c,d]);
  assert.deepEqual(scopeFor(compileCypher(query()),sheets,outgoing),[a,b,c,d]);
  assert.throws(()=>compileCypher(query('-[*1..4]->')),/inválida/);
  assert.throws(()=>compileCypher(query('<-[*1..3]->')),/inválida/);
  assert.throws(()=>compileCypher(query()+' DELETE p'),/inválida/);
});
test('tutor valida sintaxis, IDs y no ofrece instrucciones inventadas',()=>{
  const valid=query(),unknown=valid.replace(a,'inventado');
  const suggestions=validateSuggestions(`\`\`\`cypher\n${unknown}\n\`\`\`\n\`\`\`cypher\n${valid}\n\`\`\`\n\`\`\`cypher\nDROP TABLE x\n\`\`\``,sheets);
  assert.equal(suggestions.accepted.length,1);assert.equal(suggestions.accepted[0].query,valid);assert.equal(suggestions.rejected.length,2);
});
const doc=(id,reference,es,chapter=7,paragraph=null,relatedSubunits=[reference])=>({id,reference,title:id,es,gr:'ἐνέργεια',kind:paragraph===null?'subunidad':'parrafo',chapter,paragraph,relatedSubunits,staticTags:[],functionalTags:[]});
const core=doc('sub:1098a16-18','1098a16-18','actividad del alma según virtud');
const whole=doc('paragraph:7','I.7 · párr. 7','actividad del alma según virtud completa en una vida entera',7,7,['1098a16-18']);
const docs=[doc('sub:other','1099a29-31','felicidad felicidad felicidad'),core,whole];
test('Bekker exacto precede similitud y recupera párrafo que contiene la definición',()=>{
  assert.deepEqual(exactReferences({documents:docs},'Busca 1098a16–18 felicidad').map(d=>d.id),[core.id]);
  assert.equal(containingParagraph({documents:docs},core).id,whole.id);
  assert.equal(exactReferences({documents:docs},'1098a16-19').length,0);
});
const req=(cookie='',body={})=>({headers:{host:'localhost:3000',cookie},body,protocol:'http',get(k){return this.headers[k.toLowerCase()];}});
function res(){return {headers:{},data:null,statusCode:200,events:'',status(n){this.statusCode=n;return this;},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},set(k,v){return this.setHeader(k,v);},json(v){this.data=v;return this;},write(v){this.events+=v;},end(){this.writableEnded=true;},on(){}};}
function fixture(content){const prompts=[],records=[];const gw=createLLMGateway({apiKey:'fake',model:'fake',sessions:createSessionStore(),audit:{enabled:true,record:async e=>{records.push(e);return true;}},service:{obtener:async()=>({sourceHash:'rev',lectura:{txt:'test'}})},editorialLoader:async()=>[],graphLoader:async()=>({nodes:sheets,edges:[],docs:new Map()}),loadEngine:async()=>({parseBook(){},buildEvidenceDocuments(){return {documents:docs};},makeIndex,searchIndex}),fetchImpl:async(_url,o)=>{const p=JSON.parse(o.body);prompts.push(p);if(p.stream)return {ok:true,body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({choices:[{delta:{content},finish_reason:'stop'}]})}\n\ndata: [DONE]\n\n`));c.close();}})};return {ok:true,json:async()=>({choices:[{message:{content},finish_reason:'stop'}]})};}});
return {gw,prompts,records};}
const input=(requestId,mode,question)=>({requestId,mode,question,revision:'rev'});
test('tutor usa una llamada y un crédito, no necesita citas; auditoría queda en servidor',async()=>{
  const content=`Probá esto:\n\`\`\`cypher\n${query()}\n\`\`\`\n${AUDIT_MARKER}\nAuditoría privada.`;
  const f=fixture(content),s=res();await f.gw.session(req(),s);const cookie=s.headers['set-cookie'].split(';')[0];
  const body=input('request_tutor','cypher','Ver conexiones. Ejemplo: felicidad a tres aristas.');const r=res();await f.gw.stream(req(cookie,body),r);
  assert.equal(f.prompts.length,1);assert.match(f.prompts[0].messages[0].content,/Sintaxis admitida/);assert.match(f.prompts[0].messages[1].content,/faq.lab.felicidad/);assert.equal(f.prompts[0].tools,undefined);
  const done=JSON.parse(r.events.match(/event: done\ndata: (.*)/)[1]);assert.equal(done.queries.accepted[0].query,query());assert.equal(done.remaining,5);assert.equal(done.editorialAudit,undefined);assert.doesNotMatch(r.events,/Auditoría privada|audit_delta/);assert.equal(f.records[0].editorialAudit,'Auditoría privada.');
  const replay=res();await f.gw.chat(req(cookie,body),replay);assert.equal(replay.data.replay,true);assert.equal(replay.data.editorialAudit,undefined);assert.equal(f.prompts.length,1);
});
test('lectura con referencia exacta incluye el párrafo que completa su contexto',async()=>{
  const f=fixture('Explicación.\n'+AUDIT_MARKER+'\nRevisión.'),s=res();await f.gw.session(req(),s);const cookie=s.headers['set-cookie'].split(';')[0];
  const r=res();await f.gw.chat(req(cookie,input('request_exact','lectura','felicidad 1098a16-18')),r);
  assert.equal(r.statusCode,200);assert.equal(r.data.sources[0].id,core.id);assert.ok(r.data.sources.some(s=>s.id===whole.id));
  assert.match(f.prompts[0].messages[1].content,/virtud completa en una vida entera/);
});
test('tutor: encabezado de evaluación alternativo se registra, no se transmite al lector',async()=>{
  const content=`Probá esto:\n\`\`\`cypher\n${query()}\n\`\`\`\n**Evaluación interna:** Falta una ficha de naturaleza.`;
  const f=fixture(content),s=res();await f.gw.session(req(),s);const cookie=s.headers['set-cookie'].split(';')[0];
  const r=res();await f.gw.stream(req(cookie,input('request_tutor_alt','cypher','Ver conexiones')),r);
  const done=JSON.parse(r.events.match(/event: done\ndata: (.*)/)[1]);
  assert.equal(done.queries.accepted[0].query,query());assert.doesNotMatch(r.events,/Evaluación interna|Falta una ficha de naturaleza/);
  assert.equal(f.records[0].editorialAudit,'Falta una ficha de naturaleza.');assert.equal(done.remaining,5);
});
