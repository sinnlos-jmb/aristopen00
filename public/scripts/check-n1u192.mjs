import assert from 'node:assert/strict';
import {test} from 'node:test';
import {enigmas,iniciarEnigma,pedirPista,responderEnigma,revelarEnigma} from '../js/lab/enigma.js';
import {createLabEnigmaView} from '../js/views/labEnigmaView.js';
import {previewMarkup} from '../js/lab/llmGraphView.js';
for(const d of enigmas)test(`${d.id}: pistas, opciones, reintentos y solución`,()=>{
  let s=iniciarEnigma(d.id);assert.equal(s.pistas,0);for(let i=0;i<4;i++)s=pedirPista(s);assert.equal(s.pistas,d.pistas.length);assert.equal(s.resuelto,false);
  for(const [id,,feedback] of d.opciones.filter(o=>o[0]!==d.solucion)){assert.ok(feedback);s=responderEnigma(s,id);assert.equal(s.resuelto,false);assert.throws(()=>responderEnigma(s,id));}
  s=responderEnigma(s,d.solucion);assert.equal(s.resuelto,true);assert.equal(s.revelado,false);assert.throws(()=>responderEnigma(s,d.solucion));
  const revealed=revelarEnigma(iniciarEnigma(d.id));assert.equal(revealed.revelado,true);assert.equal(revealed.resuelto,false);assert.throws(()=>responderEnigma(revealed,d.solucion));
});
test('modal usa texto editorial escapado y no navega automáticamente',()=>{
  const h=previewMarkup({title:'<script>',url:'/#/fichas/felicidad',preview:{introduccion:['<img onerror=x>'],referencias:['1098a16–18'],estado:'borrador'}});assert.match(h,/&lt;script&gt;/);assert.match(h,/&lt;img/);assert.doesNotMatch(h,/<img/);assert.match(h,/1098a16/);assert.match(h,/target="_blank"/);assert.doesNotMatch(previewMarkup({url:'javascript:alert(1)'}),/href=/);
});
test('Enigma: interfaz simulada, pistas, error, resolución y enlaces',()=>{
  const prev=globalThis.document;let click;const el={innerHTML:'',style:{setProperty(){}},querySelectorAll:()=>[],querySelector:()=>null,contains:()=>true,addEventListener:(e,f)=>{click=f;},removeEventListener(){}};
  globalThis.document={createElement:()=>el,querySelector:()=>({})};try{const v=createLabEnigmaView();const press=(dataset,attrs=[])=>click({target:{closest:()=>({dataset,hasAttribute:k=>attrs.includes(k)})}});assert.match(el.innerHTML,/Elegí un enigma/);press({enigmaStart:'fin'});assert.doesNotMatch(el.innerHTML,/Enigma resuelto/);press({},['data-enigma-hint']);assert.match(el.innerHTML,/Pedir pista \(1\/2\)/);press({enigmaAnswer:'arete'});assert.match(el.innerHTML,/Podés intentar otra opción/);press({enigmaAnswer:'eudaimonia'});assert.match(el.innerHTML,/Enigma resuelto/);assert.match(el.innerHTML,/#\/grafos\/forma/);press({},['data-enigma-reset']);assert.doesNotMatch(el.innerHTML,/Enigma resuelto/);press({},['data-enigma-reveal']);assert.match(el.innerHTML,/Resolución revelada/);v.destroy();}finally{globalThis.document=prev;}
});
