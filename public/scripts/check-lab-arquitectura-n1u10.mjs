// N1-U.10 · Pruebas sin DB ni navegador, sobre preferencias visuales y navegación editorial.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layoutParaGuardar, leerLayout, cargarLayoutLocal, guardarLayoutLocal, limpiarGrupo, LAYOUT_STORAGE_KEY } from '../js/lab/architectureLayout.js';
import { guiaExplicativaHtml } from '../js/lab/architectureTextGuide.js';
import { elementosRedFichas } from '../js/lab/architecturePilotNetwork.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = name => readFileSync(resolve(root, name), 'utf8');
const view = src('js/views/labArchitectureView.js');
const css = src('css/lab-arquitectura-n1u2.css');
const bridge = src('js/lab/architectureBridges.js');
const red = JSON.parse(src('lab/n1u7-fichas-red-piloto.json'));
const positions = new Map([
  ['red-fichas:red:ficha:faq.etica.intro', {x:828,y:110}],
  ['ficha:faq.lab.felicidad:ficha:faq.lab.felicidad:p1', {x:200,y:320}],
  ['puente:faq.lab.felicidad:apoyos:puente:faq.lab.felicidad:sub:1098a16-18', {x:45,y:64}],
]);
const saved = layoutParaGuardar(positions);
assert.equal(saved.nodes.length, 3);
assert.equal(leerLayout(JSON.stringify(saved)).size, 3);
assert.deepEqual(leerLayout(saved).get('red-fichas:red:ficha:faq.etica.intro'), {x:828,y:110});
assert.throws(() => leerLayout(JSON.stringify({...saved, schema:'evil'})), /inválido/);
assert.throws(() => leerLayout({schema:saved.schema, nodes:[{group:'red-fichas:',id:'x',x:Infinity,y:1}]}), /inválido/);
assert.throws(() => leerLayout({schema:saved.schema, nodes:[{group:'red-fichas:',id:'x',x:1,y:1},{group:'red-fichas:',id:'x',x:1,y:2}]}), /duplicado/);
let storageData = null;
const storage = { setItem(k,v) {assert.equal(k,LAYOUT_STORAGE_KEY);storageData=v;}, getItem() {return storageData;} };
assert.equal(guardarLayoutLocal(storage,positions),3);
assert.equal(cargarLayoutLocal(storage).size,3);
limpiarGrupo(positions,'red-fichas:');assert.equal(positions.size,2);
assert.equal(cargarLayoutLocal({getItem(){throw new Error('bloqueado');}}).size,0);
const fichas = new Map([
  ['faq.etica.intro', {titulo:'Ética'}], ['proemio',{titulo:'Proemio'}], ['faq.agathon.pros_hen',{titulo:'Bien'}],
  ...red.fichas.map(f=>[f.id,f])
]);
const nodes = elementosRedFichas({revision:'x', porId:fichas}, {revision:'x',relaciones:red.red.relaciones});
assert.equal(nodes.filter(x=>x.group==='nodes').length,7);
assert.equal(nodes.filter(x=>x.group==='edges').length,8);
const node = id => nodes.find(x=>x.data.key===id);
assert(node('faq.etica.intro').position.y < node('faq.lab.felicidad').position.y);
assert(node('faq.lab.virtudes').position.x < node('faq.lab.felicidad').position.x);
assert(node('faq.lab.ergon').position.x > node('faq.lab.felicidad').position.x);
assert(node('faq.lab.alma').position.y > node('faq.lab.felicidad').position.y);
const felicidad = red.fichas.find(f=>f.id==='faq.lab.felicidad');
const bridgeF = {contextos:felicidad.contextos, apoyos:felicidad.apoyos};
const content = guiaExplicativaHtml(felicidad, null, {pasoId:'p3', puente:bridgeF, unidadId:'forma_fin'});
assert(content.includes('data-arch-guide-step="p3" aria-pressed="true"'));
assert(content.includes('data-arch-guide-support="1097a34-b6"'));
assert(content.includes('data-arch-guide-unit="forma_fin"'));
const hostile = { ...felicidad, pasos: felicidad.pasos.map(p=>p.id==='p3'?{...p, comentario:'<script>mal</script>'}:p) };
assert(!guiaExplicativaHtml(hostile,null,{pasoId:'p3',puente:bridgeF}).includes('<script>'));
for (const marker of ['data-arch-layout-save','data-arch-layout-reset','data-arch-layout-export','data-arch-layout-import',
  'data-arch-guide-step','data-arch-guide-support','data-arch-guide-unit','data-arch-guide-module']) assert(view.includes(marker),marker);
assert(view.includes('snapshotLayout()') && view.includes('cargarLayoutLocal(layoutStorage)'));
assert(view.includes('guiaExplicativaHtml(ficha, capas'));
assert(view.includes("perspectiva = 'apoyos'"));
assert(bridge.includes('data-arch-guide-step'));
assert(css.includes('.arch-guide') && css.includes('.arch-layout-tools'));
assert(!view.includes('UPDATE faqs') && !view.includes('INSERT INTO'));
console.log('N1-U.10 OK · siete posiciones iniciales, almacenamiento local, export/import, guía texto↔grafo, puentes curatoriales y HTML seguro.');
