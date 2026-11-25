import test from 'node:test';
import assert from 'node:assert/strict';
import {createSectionSplitter,splitSections,AUDIT_MARKER} from '../../src/llm/sections.js';
import {planningMessages,compactToolOutput} from '../../src/llm/planning.js';
import {renderLLMMarkdown} from '../../public/js/lab/llmMarkdown.js';
import {graphViews,renderLLMGraph} from '../../public/js/lab/llmGraphView.js';

const read='Explicación y consultas comprobadas.';
const privateText='Falta un nodo de naturaleza.';
test('encabezado alternativo de auditoría no aparece ni siquiera en streaming fragmentado',()=>{
  for(const boundary of ['  **Evaluación interna:** ','\nEvaluación interna: ','\n  Evaluación interna: ','\n### Evaluación editorial: ',`\n${AUDIT_MARKER}\n`]){
    const s=createSectionSplitter();let visible='';
    for(const char of read+boundary+privateText)visible+=s.take(char).answerDelta;
    const final=s.finish();visible+=final.answerDelta;
    assert.equal(visible.trim(),read);assert.equal(final.answer,read);assert.equal(final.editorialAudit,privateText);
    assert.equal(final.auditMissing,false);
  }
});
test('no confunde una mención corriente con un encabezado interno',()=>{
  const s=createSectionSplitter(), text='No confundas la evaluación interna: es otra cuestión.';
  s.take('No confundas la ');s.take('evaluación interna: es otra cuestión.');assert.equal(s.finish().answer,text);
  assert.equal(splitSections(text).auditMissing,true);
});
test('planificación liviana conserva referencias y contexto, sin enviar el corpus íntegro',()=>{
  const found={history:[{question:'¿Felicidad?',answer:'a'.repeat(3000)}],sources:[{id:'sub:1098a16-18',title:'Definición',reference:'1098a16-18',label:'E1',es:'NO_ENVIAR_ES',gr:'NO_ENVIAR_GR'}]};
  const graph={nodes:new Map([['f',{id:'f',type:'ficha',title:'Felicidad',introduccion:'NO_ENVIAR_FICHA'}]])};
  const messages=planningMessages('¿Y la virtud?',found,graph);
  assert.match(messages[1].content,/1098a16-18/);assert.match(messages[1].content,/Felicidad/);assert.doesNotMatch(messages[1].content,/NO_ENVIAR/);
  assert.equal(JSON.parse(messages[1].content).antecedentes[0].respuesta.length,350);
  const output=compactToolOutput({evidence:found.sources,nodes:[],edges:[],introduccion:'NO_ENVIAR_FICHA'});
  assert.match(JSON.stringify(output),/1098a16-18/);assert.doesNotMatch(JSON.stringify(output),/NO_ENVIAR/);
  assert.equal(found.sources[0].es,'NO_ENVIAR_ES'); // La generación final aún tiene el texto canónico.
});
test('Markdown de lectura: énfasis, listas y Cypher, sin ejecutar HTML remoto',()=>{
  const html=renderLLMMarkdown('**Felicidad** y *virtud*\n\n- una condición\n- otra\n\n```cypher\nMATCH (f:Ficha)\n```\n\n<img src=x onerror=alert(1)>');
  assert.match(html,/<strong>Felicidad<\/strong>/);assert.match(html,/<em>virtud<\/em>/);assert.match(html,/<ul><li>una condición/);assert.match(html,/<pre><code>MATCH/);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
  assert.match(renderLLMMarkdown('```cypher MATCH p RETURN p ```'),/<pre><code>MATCH p RETURN p/);
});
const trace={state:'consultado',nodes:[{id:'f',type:'ficha',title:'Felicidad',url:'/#/fichas/felicidad'},{id:'v',type:'ficha',title:'Virtudes',url:'javascript:alert(1)'},{id:'s',type:'pasaje',reference:'1098a16-18',title:'Definición'}],edges:[{id:'r',type:'relacion',from:'v',to:'f',label:'precisa la excelencia'},{id:'a',type:'apoyo',from:'f',to:'s',label:'apoyo documental',rol:'Actividad excelente'}],paths:[{ids:['f','v'],edgeIds:['r']},{ids:['f','s'],edgeIds:['a']},{ids:['f','v'],edgeIds:['inventada']}],steps:[{tool:'obtener_ficha',ok:true}],planningIssues:[{reason:'NO_MOSTRAR'}]};
test('separación de caminos, fichas y apoyos; se conserva dirección y se descartan caminos sin respaldo',()=>{
  const views=graphViews(trace);assert.equal(views.relations.length,1);assert.equal(views.support.length,1);assert.equal(views.paths.length,1);
  const html=renderLLMGraph(trace);assert.match(html,/Caminos consultados \(1\)/);assert.match(html,/sentido inverso/);assert.match(html,/Subgrafo de fichas/);assert.match(html,/Apoyos documentales/);assert.match(html,/1098a16-18/);assert.doesNotMatch(html,/javascript:|NO_MOSTRAR|obtener_ficha/);
  assert.doesNotMatch(html.match(/<svg[\s\S]*?<\/svg>/)[0],/1098a16-18/);
});
