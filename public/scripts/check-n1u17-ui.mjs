// Prueba de composición de la vista sin navegador/MariaDB; revisa los nuevos modos.
import assert from 'node:assert/strict';
import { createLabConsultaView } from '../js/views/labConsultaView.js';
const handlers=new Map();
const content={innerHTML:'',className:'',dataset:{},
  querySelectorAll(selector){
    if(selector==='[data-mode]')return [...this.innerHTML.matchAll(/data-mode="([^"]+)"/g)].map(([,mode])=>({dataset:{mode},addEventListener(_evt,fn){handlers.set(mode,fn);}}));
    return [];
  },
  querySelector(selector){
    if(selector==='#lq-form')return this.innerHTML.includes('id="lq-form"')?{elements:{},addEventListener(){}}:null;
    if(selector==='#lq-llm-form')return this.innerHTML.includes('id="lq-llm-form"')?{elements:{llmQuestion:{value:'actividad del alma'},llmMode:{value:'lectura'}},addEventListener(){}}:null;
    return null;
  },
};
globalThis.document={
  head:{appendChild(){}},
  querySelector(){return null;},
  createElement(name){return name==='div'?content:{dataset:{}};},
};
const json={revision:'rev-test',tags:{unidades:[{id:'I.7',titulo:'Felicidad',subunidades:[{
  id:'1098a16-20',titulo:'Actividad conforme a virtud',intro:'Actividad',
  es_ancla:{inicio:'La felicidad',fin:'virtud'},gr_ancla:{inicio:'εὐδαιμονία',fin:'ἀρετή'},
  conceptos_clave:['arete'],movimientos:['definicion'],
}]}]}};
const text='7\n{"parrafo_nro":1}\nLa felicidad es actividad del alma conforme a la virtud.\nἡ εὐδαιμονία ἐνέργεια ἀρετή\n';
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{
  if(url==='/api/labo/lectura')return {ok:true,json:async()=>json};
  if(url==='/api/texto/EN_libro1_v8.txt')return {ok:true,text:async()=>text};
  if(url==='/api/llm/session')return {ok:true,json:async()=>({configured:true,remaining:6,limit:6,pending:0,model:'openrouter/free'})};
  return {ok:false,status:404};
};
const view=createLabConsultaView({});
await new Promise(resolve=>setTimeout(resolve,20));
assert.match(content.innerHTML,/data-mode="categorias"/);
assert.match(content.innerHTML,/data-mode="llm"/);
assert.match(content.innerHTML,/Esta pestaña recupera por palabras/);
assert.ok(handlers.has('categorias'));
handlers.get('categorias')();
assert.match(content.innerHTML,/lq-facets/);
assert.match(content.innerHTML,/data-tag="static"/);
assert.doesNotMatch(content.innerHTML,/name="visualQuery"/);
assert.match(content.innerHTML,/Ejecutar consulta/);
handlers.get('llm')();
await new Promise(resolve=>setTimeout(resolve,20));
assert.match(content.innerHTML,/Generaciones disponibles/);
assert.match(content.innerHTML,/6 de 6/);
assert.match(content.innerHTML,/id="lq-llm-form"/);
assert.doesNotMatch(content.innerHTML,/id="lq-form"/);
view.destroy();globalThis.fetch=originalFetch;
console.log('N1-U.17 UI OK: pestañas, recuperación por etiquetas y cupo de LLM.');
