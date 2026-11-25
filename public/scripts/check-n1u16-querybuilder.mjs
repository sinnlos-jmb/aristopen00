// Ágora · N1-U.16. Pruebas sin navegador, API ni MariaDB.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname,resolve,join } from 'node:path';
import { compileNatural,compileVisual,compileCypher,compileHybrid,graphMatches,scopeFor,queryWarning,parseQuery } from '../js/lab/queryMultimodal.js';
import { makeIndex, searchIndex } from '../labo/js/vectorial-engine.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const src=name=>readFileSync(join(root,name),'utf8');
const source='felicidad actividad virtud';
const visual={query:source,type:'parrafo',sheetId:'faq.lab.felicidad',limit:12,staticTags:['arete'],functionalTags:['definicion'],filterMode:'restrict'};
const a=compileNatural(source,visual),b=compileVisual(visual);
assert.deepEqual(a,b,'natural y visual deben compilar al mismo AST con idénticos parámetros');
assert.equal(parseQuery('visual','',visual).query,source);
const hybrid=compileHybrid("SELECT PASAJES WHERE TEXTO CONTAINS 'felicidad actividad virtud' AND TIPO = 'parrafo' AND FICHA = 'faq.lab.felicidad' AND ESTATICA = 'arete' AND FUNCIONAL = 'definicion' AND MODO = 'restrict' LIMIT 12");
assert.deepEqual(hybrid,b,'el lenguaje híbrido debe reproducir el mismo plan textual');
const cypher=compileCypher("MATCH (f:Ficha)-[:RELACIONADA_CON]->(g:Ficha) WHERE f.id = 'faq.lab.felicidad' RETURN f, g SEARCH 'actividad virtud'");
assert.equal(cypher.graph.fromId,'faq.lab.felicidad');
assert.equal(cypher.query,'actividad virtud');
assert.deepEqual(cypher.graph.returned,['origen','destino']);
for(const q of [
  'MATCH (f:Ficha) DETACH DELETE f',
  "MATCH (f:Ficha)-[:RELACIONADA_CON]->(g:Ficha) WHERE f.id = 'a' RETURN h",
  "MATCH (f:Ficha)-[:INVENTADA]->(g:Ficha) WHERE f.id = 'a' RETURN g",
]) assert.throws(()=>compileCypher(q),/Consulta inválida/);
for (const q of [
  'DELETE FROM corpus',
  "SELECT PASAJES WHERE TEXTO CONTAINS 'felicidad'; DROP TABLE faqs",
  "SELECT PASAJES WHERE TEXTO CONTAINS 'felicidad' AND foo = 'bar'",
  "SELECT PASAJES WHERE TEXTO CONTAINS 'felicidad' LIMIT 99",
])assert.throws(()=>compileHybrid(q),/Consulta inválida/);
const sheets=new Map([
  ['faq.lab.felicidad',{supports:['1098a16-20','1098a20-22']}],
  ['faq.lab.ergon',{supports:['1097b24-30']}],
  ['faq.lab.alma',{supports:['1102a5-10']}],
]);
const edges=[{id:'r1',desde:'faq.lab.felicidad',hacia:'faq.lab.ergon',nombre:'requiere determinación',explicacion:'Apoyo editorial'},
  {id:'r2',desde:'faq.lab.ergon',hacia:'faq.lab.alma',nombre:'motiva examinar el alma',explicacion:'Apoyo editorial'}];
const gm=graphMatches(cypher,edges,sheets);
assert.deepEqual(gm.sheetIds,['faq.lab.felicidad','faq.lab.ergon']);
assert.equal(gm.edges.length,1);
assert.deepEqual(scopeFor(cypher,sheets,gm),['1098a16-20','1098a20-22','1097b24-30']);
assert.deepEqual(scopeFor(b,sheets,{sheetIds:[]}),['1098a16-20','1098a20-22']);
assert.equal(scopeFor(compileNatural('felicidad'),sheets,{sheetIds:[]}),null);
assert.throws(()=>scopeFor({...b,sheetId:'inexistente'},sheets,{sheetIds:[]}),/revisión/);
assert.match(queryWarning('Eudaimonía y lógos'),/sentidos distintos/);
assert.equal(queryWarning('felicidad y actividad'),'');
const docs=[
  {id:'p1',kind:'parrafo',title:'Actividad racional',es:'La felicidad consiste en actividad del alma según virtud.',gr:'',intro:'',staticTags:['arete'],functionalTags:['definicion'],relatedSubunits:['1098a16-20']},
  {id:'p2',kind:'parrafo',title:'Placer',es:'El placer se busca.',gr:'',intro:'',staticTags:['hedone'],functionalTags:[],relatedSubunits:['1098a16-20']},
  {id:'p3',kind:'parrafo',title:'Érgon',es:'La actividad propia es un tipo de vida racional.',gr:'',intro:'',staticTags:['ergon'],functionalTags:[],relatedSubunits:['1097b24-30']},
];
const index=makeIndex(docs);
const hits=searchIndex(index,{...b,supportSubIds:scopeFor(b,sheets,{sheetIds:[]})});
assert.equal(hits.length,1);assert.equal(hits[0].id,'p1');
const script=src('js/views/lab.js'),view=src('js/views/labConsultaView.js');
assert(script.includes("id: 'consultas'") && script.includes("opts.exp === 'consultas'"));
assert(view.includes('/api/labo/lectura') && view.includes("../../labo/js/vectorial-engine.js"));
assert(view.includes('revisión') && view.includes('data.sheets'));
assert(!view.includes('new Function(')&&!view.includes('eval('));
console.log('N1-U.16 OK: 4 modos, AST común, solo lectura, grafos editoriales, alcance por ficha, ranking y tarjeta Lab.');
