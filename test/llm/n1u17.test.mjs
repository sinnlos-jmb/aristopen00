// Ejecutar: node --test test/llm/n1u17.test.mjs · no requiere MariaDB ni OpenRouter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionStore } from '../../src/llm/session.js';
import { createLLMGateway, LLM_PROMPT_VERSION } from '../../src/llm/gateway.js';
import { compileVisual } from '../../public/js/lab/queryMultimodal.js';
import { makeIndex, searchIndex } from '../../public/labo/js/vectorial-engine.js';

function makeReq(cookie='',body={},origin=''){
  const headers={host:'localhost:3000',cookie,...(origin?{origin}:{})};
  return {headers,body,protocol:'http',get(name){return headers[name.toLowerCase()];}};
}
function makeRes(){return {statusCode:null,headers:{},data:null,
  setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},
  set(k,v){this.headers[k.toLowerCase()]=v;return this;},
  status(n){this.statusCode=n;return this;},
  json(data){this.data=data;return this;}};}
function fixture({limit=6,apiKey='key-placeholder',fetchImpl=null,editorialLoader=null}={}) {
  const docs=[
    {id:'sub:1098a',kind:'subunidad',reference:'1098a',title:'Felicidad',es:'La felicidad es una actividad del alma de acuerdo con la virtud.',gr:'εὐδαιμονία ἐνέργεια ψυχῆς',intro:'',unit:'I',relatedSubunits:['1098a'],staticTags:['arete'],functionalTags:['definicion'],tagOrigin:'directa'},
    {id:'paragraph:8',kind:'parrafo',reference:'I.7 párr. 8',title:'Función',es:'La función humana implica una actividad racional.',gr:'λόγον ἔχον',intro:'',unit:'I',relatedSubunits:['1098a'],staticTags:['logos'],functionalTags:['argumento'],tagOrigin:'proyectada'},
  ];
  const indexed=makeIndex(docs);
  const loadEngine=async()=>({parseBook(){},buildEvidenceDocuments(){return {documents:docs}},makeIndex,searchIndex});
  const service={async obtener(){return {sourceHash:'rev1',lectura:{txt:'Libro I',tags:{}}}}};
  let upstream=0, body=null;
  const fetchFake=fetchImpl|| (async (_url,opts)=>{upstream++;body=JSON.parse(opts.body);return {ok:true,json:async()=>({model:'modelo-ensayo',choices:[{message:{content:'La actividad es esencial [E1].'}}],usage:{prompt_tokens:120,completion_tokens:24}})};});
  const gateway=createLLMGateway({service,loadEngine,...(editorialLoader?{editorialLoader}:{}),fetchImpl:fetchFake,apiKey,model:'modelo-ensayo',sessions:createSessionStore({limit}),audit:{enabled:false,record:async()=>false}});
  return {gateway,get upstream(){return upstream;},get prompt(){return body;},indexed};
}
function input(id,question='felicidad actividad'){return {requestId:`request_${id}abcdef`,question,mode:'lectura',revision:'rev1'};}

test('La búsqueda por categorías no necesita palabra alguna y tiene AST auditable',()=>{
  const ast=compileVisual({query:'',staticTags:['arete'],functionalTags:[],limit:12,filterMode:'restrict'});
  assert.equal(ast.query,'');
  const f=fixture();
  const hits=searchIndex(f.indexed,ast);
  assert.ok(hits.length>0);assert.ok(hits.every(h=>h.staticTags.includes('arete')));
});

test('Sesión 6 créditos: no se envía clave, se verifica fuente y siete peticiones no gastan 7',async()=>{
  const f=fixture();const init=makeRes();
  await f.gateway.session(makeReq(),init);
  assert.equal(init.statusCode,200);assert.equal(init.data.limit,6);assert.equal(init.data.remaining,6);
  const cookie=init.headers['set-cookie'].split(';')[0];
  const req=makeReq(cookie,{...input('01'),sourceIds:['sub:1098a'],history:[{question:'¿Qué es?',answer:'Actividad'}]});
  const res=makeRes();await f.gateway.chat(req,res);
  assert.equal(res.statusCode,200);assert.equal(res.data.used,1);assert.equal(res.data.remaining,5);
  assert.equal(res.data.sources[0].id,'sub:1098a');
  assert.equal(f.prompt.messages[0].role,'system');
  assert.doesNotMatch(f.prompt.messages[1].content,/Pregunta anterior: ¿Qué es\?/); // No confiar en historial declarado por cliente.
  assert.match(f.prompt.messages[1].content,/\[E1\]/);
  assert.ok(!JSON.stringify(res.data).includes('key-placeholder'));
  for(let i=2;i<=6;i++){
    const next=makeRes();await f.gateway.chat(makeReq(cookie,input(String(i).padStart(2,'0'))),next);
    assert.equal(next.statusCode,200);
  }
  const last=makeRes();await f.gateway.chat(makeReq(cookie,input('07')),last);
  assert.equal(last.statusCode,429);assert.equal(last.data.remaining,0);assert.equal(f.upstream,6);
  const repeated=makeRes();await f.gateway.chat(req,repeated);
  assert.equal(repeated.statusCode,200);assert.equal(repeated.data.replay,true);assert.equal(f.upstream,6);
});

test('Se recuperan citas canónicas, no texto enviado por el cliente ni referencias inexistentes',async()=>{
  const f=fixture();const init=makeRes();await f.gateway.session(makeReq(),init);
  const cookie=init.headers['set-cookie'].split(';')[0];
  const invalid=makeRes();await f.gateway.chat(makeReq(cookie,{...input('10'),sourceIds:['falsa'] }),invalid);
  assert.equal(invalid.statusCode,400);assert.equal(f.upstream,0);
  const altered=makeRes();await f.gateway.chat(makeReq(cookie,{...input('11'),revision:'otra-revision'}),altered);
  assert.equal(altered.statusCode,409);assert.equal(f.upstream,0);
  const s=makeRes();await f.gateway.session(makeReq(cookie),s);assert.equal(s.data.remaining,6);
});

test('Si OpenRouter falla, el cupo vuelve a quedar disponible',async()=>{
  const f=fixture({fetchImpl:async()=>({ok:false,status:429})});
  const init=makeRes();await f.gateway.session(makeReq(),init);
  const cookie=init.headers['set-cookie'].split(';')[0];
  const err=makeRes();await f.gateway.chat(makeReq(cookie,input('30')),err);
  assert.equal(err.statusCode,502);
  const check=makeRes();await f.gateway.session(makeReq(cookie),check);assert.equal(check.data.remaining,6);
});

test('Bloquea orígenes externos antes de reservar créditos',async()=>{
  const f=fixture();const res=makeRes();await f.gateway.chat(makeReq('',input('40'),'https://evil.example'),res);
  assert.equal(res.statusCode,403);assert.equal(f.upstream,0);
});

test('Dos peticiones simultáneas nunca superan el cupo',async()=>{
  let unblock;const pause=new Promise(r=>unblock=r);
  const f=fixture({limit:1,fetchImpl:async()=>{await pause;return {ok:true,json:async()=>({choices:[{message:{content:'Respuesta con fuente [E1]'}}]})}}});
  const init=makeRes();await f.gateway.session(makeReq(),init);
  const cookie=init.headers['set-cookie'].split(';')[0];
  const first=makeRes(),second=makeRes();
  const p1=f.gateway.chat(makeReq(cookie,input('50')),first);
  // Esperar a que evidence complete sin asumir un temporizador largo.
  await new Promise(r=>setImmediate(r));
  await f.gateway.chat(makeReq(cookie,input('51')),second);
  assert.equal(second.statusCode,429);
  unblock();await p1;assert.equal(first.statusCode,200);
  assert.equal(first.data.used,1);assert.equal(first.data.remaining,0);
});

test('Instrucciones versionadas y modo contraste no aceptan modelos del navegador',async()=>{
  const f=fixture();const init=makeRes();await f.gateway.session(makeReq(),init);
  const cookie=init.headers['set-cookie'].split(';')[0];
  const res=makeRes();await f.gateway.chat(makeReq(cookie,{...input('60'),mode:'contraste',model:'otro-modelo',apiKey:'evil'}),res);
  assert.equal(res.statusCode,200);assert.equal(res.data.promptVersion,LLM_PROMPT_VERSION);
  assert.equal(f.prompt.model,'modelo-ensayo');
  assert.ok(!JSON.stringify(f.prompt).includes('evil'));
});


test('Las notas de ficha se distinguen de las citas primarias y se exponen como borrador',async()=>{
  const f=fixture({editorialLoader:async()=>[{id:'faq.lab.felicidad',title:'¿Qué es la felicidad?',
    estado:'borrador_no_publicado',introduccion:'La felicidad se examina como actividad.'}]});
  const init=makeRes();await f.gateway.session(makeReq(),init);
  const cookie=init.headers['set-cookie'].split(';')[0];
  const res=makeRes();await f.gateway.chat(makeReq(cookie,input('70')),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.data.fichas[0].estado,'borrador_no_publicado');
  assert.match(f.prompt.messages[1].content,/interpretación editorial, NO citas de Aristóteles/);
});

test('El presupuesto de salida es superior al antiguo y el mensaje llega en bloques de texto',async()=>{
  let sent;
  const f=fixture({fetchImpl:async (_url,opts)=>{
    sent=JSON.parse(opts.body);
    return {ok:true,json:async()=>({model:'chat-ensayo',choices:[{finish_reason:'stop',message:{content:[
      {type:'text',text:'La felicidad exige actividad '},{type:'output_text',text:'del alma [E1].'}
    ]}}]})};
  }});
  const init=makeRes();await f.gateway.session(makeReq(),init);
  const cookie=init.headers['set-cookie'].split(';')[0];
  const res=makeRes();await f.gateway.chat(makeReq(cookie,input('80')),res);
  assert.equal(res.statusCode,200);
  assert.match(res.data.answer,/actividad/);
  assert.match(res.data.answer,/del alma/);
  assert.ok(sent.max_tokens>650 && sent.max_tokens<=4096);
});

test('La respuesta vacía por límite de razonamiento devuelve diagnóstico sin gastar cupo',async()=>{
  const f=fixture({fetchImpl:async()=>({ok:true,json:async()=>({
    model:'modelo/razonador:free',choices:[{finish_reason:'length',message:{content:null,reasoning:'NO EXPONER'}}],
    usage:{completion_tokens:650,completion_tokens_details:{reasoning_tokens:648}}
  })})});
  const init=makeRes();await f.gateway.session(makeReq(),init);
  const cookie=init.headers['set-cookie'].split(';')[0];
  const res=makeRes();await f.gateway.chat(makeReq(cookie,input('81')),res);
  assert.equal(res.statusCode,502);
  assert.match(res.data.error,/modelo=\S*razonador/);
  assert.match(res.data.error,/fin=length/);
  assert.match(res.data.error,/tokens_razonamiento=648/);
  assert.ok(!JSON.stringify(res.data).includes('NO EXPONER'));
  const check=makeRes();await f.gateway.session(makeReq(cookie),check);
  assert.equal(check.data.remaining,6);
});

test('La respuesta vacía de otro tipo también informa modelo y motivo',async()=>{
  const f=fixture({fetchImpl:async()=>({ok:true,json:async()=>({
    model:'proveedor/modelo',choices:[{finish_reason:'stop',message:{content:[]}}]
  })})});
  const init=makeRes();await f.gateway.session(makeReq(),init);
  const cookie=init.headers['set-cookie'].split(';')[0];
  const res=makeRes();await f.gateway.chat(makeReq(cookie,input('82')),res);
  assert.equal(res.statusCode,502);
  assert.match(res.data.error,/fin=stop/);
  assert.match(res.data.error,/proveedor\/modelo/);
  const check=makeRes();await f.gateway.session(makeReq(cookie),check);
  assert.equal(check.data.remaining,6);
});
