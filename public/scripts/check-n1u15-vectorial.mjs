// Ágora · N1-U.15 · Pruebas puras, sin navegador, red ni MariaDB.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { parseBook } from '../js/reader/text.js';
import { buildEvidenceDocuments, buildSheetLinks, categoryChoices, makeIndex, searchIndex, normalizeText } from '../labo/js/vectorial-engine.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = name=>readFileSync(join(root,name),'utf8');

// Prueba del lector con un fragmento bilingüe real del Libro I, si existe.
const raw=`1\n{ "parrafo_nro": 1 }\nToda arte y toda investigación parecen tender a algún bien. Las acciones tienen fines.\n1094a Πᾶσα τέχνη καὶ πᾶσα μέθοδος, ἀγαθοῦ τινὸς ἐφίεσθαι δοκεῖ·\n`;
const book=parseBook(raw);
const lectura={ revision:'test-revision',tags:{unidades:[{
  id:'proemio',titulo:'Proemio',subunidades:[
    {id:'1094a1-3',titulo:'Todo tiende al bien',intro:'Los fines de la acción',
      es_ancla:{inicio:'Toda arte',fin:'Las acciones tienen fines.'},
      gr_ancla:{inicio:'Πᾶσα τέχνη',fin:'ἐφίεσθαι δοκεῖ·'},
      conceptos_clave:['bien','telos'],movimientos:['definicion']},
  ],
}]}};
const corpus=buildEvidenceDocuments(lectura,book);
assert.equal(corpus.documents.length,2);
const sub=corpus.documents.find(d=>d.kind==='subunidad');
const para=corpus.documents.find(d=>d.kind==='parrafo');
assert.match(sub.es,/Toda arte/);
assert.match(sub.gr,/Πᾶσα/);
assert.deepEqual(sub.staticTags,['bien','telos']);
assert.deepEqual(para.relatedSubunits,['1094a1-3']);
assert.match(para.tagOrigin,/NO tagueo del párrafo/);
assert.equal(normalizeText('Ἀρετή, felicidad'), 'αρετη felicidad');

const index=makeIndex(corpus.documents);
let hits=searchIndex(index,{query:'acciones tienen fines'});
assert.equal(hits.length,2);
assert(hits[0].score>0);
assert(hits[0].matchedTerms.includes('acciones'));
hits=searchIndex(index,{query:'inexistente',staticTags:['bien'],filterMode:'boost'});
assert(hits.length>0,'Un tag aporta candidatos aun sin coincidencia textual');
hits=searchIndex(index,{query:'acciones',staticTags:['sin_correspondencia'],filterMode:'restrict'});
assert.equal(hits.length,0,'El filtro estricto descarta resultados sin el tag');
hits=searchIndex(index,{query:'acciones',supportSubIds:['otra_subunidad']});
assert.equal(hits.length,0,'El alcance de una ficha requiere respaldo editorial explícito');
hits=searchIndex(index,{query:'acciones',supportSubIds:['1094a1-3'],type:'parrafo'});
assert.equal(hits.length,1);
assert.equal(categoryChoices(corpus.documents,'static').find(x=>x.id==='bien').count,1,'La proyección a párrafos no infla recuentos de tags');
assert.throws(()=>makeIndex([sub,sub]),/duplicado/);

const links=buildSheetLinks([
  {fichas:[{id:'faq.etica.intro',titulo:'¿Qué es la ética?',apoyos:[],pasos:[]}]},
],{puentes:[{ficha_id:'faq.etica.intro',apoyos:[{sub_id:'1094a1-3'}]}]});
assert.equal(links.get('1094a1-3')[0].url,'/#/fichas/etica');

// Verificación estática de la integración del Lab, sin cargar ni reemplazar la aplicación.
const main=file('labo/js/main.js'), page=file('labo/index.html'), view=file('labo/js/views/vectorial.js');
assert(main.includes("route.section === 'vectorial'"));
assert(page.includes('data-section="vectorial"'));
assert(view.includes('/api/labo/lectura') && view.includes('/api/texto/EN_libro1_v8.txt'));
assert(view.includes('Consulta alternativa para contrastar'));
assert(view.includes('s.sheetId'));
assert(view.includes('revisión')||view.includes('revision'));
assert(!view.includes('/api/openai') && !view.includes('apiKey'));
console.log('N1-U.15 OK: índice vectorial, tags, párrafos, fichas, filtro por respaldo y navegación del Labo.');
