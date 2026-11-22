// N1-U.11 · Integridad editorial y proyección estructural selectiva (sin DB/DOM).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { construirModeloArquitectura } from '../js/lab/architectureModel.js';
import { construirRelacionesProemio } from '../js/lab/architectureRelations.js';
import { construirCapasProemio } from '../js/lab/architectureLayers.js';
import { construirFichasArquitectura } from '../js/lab/architectureCards.js';
import { construirPuentesExplicativos } from '../js/lab/architectureBridges.js';
import { construirAmpliacionFichas } from '../js/lab/architecturePilotNetwork.js';
import { construirCatalogoExplicativo, composicionFaqHtml } from '../js/lab/architectureEditorialNetwork.js';
import { elementosContextoEstructural, inspectorContextoEstructuralHtml } from '../js/lab/architectureStructuralContext.js';
const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url),'utf8'));
const snapshot = read('./fixtures/n1u2-unidades.json');
const initial = JSON.stringify(snapshot);
const model = construirModeloArquitectura(snapshot, read('../lab/n1u1-propuestas-libro-i.json'));
const rels = construirRelacionesProemio(model,read('../lab/n1u3-relaciones-proemio.json'));
const capas = construirCapasProemio(model,rels,read('../lab/n1u4-modulos-proemio.json'));
const fichasBase = construirFichasArquitectura(model,capas,read('../lab/n1u5-fichas-explicativas.json'));
const puentesBase = construirPuentesExplicativos(model,fichasBase,read('../lab/n1u6-puentes-explicativos.json'));
const {fichas,puentes} = construirAmpliacionFichas(model,fichasBase,puentesBase,read('../lab/n1u7-fichas-red-piloto.json'));
const recurso = read('../lab/n1u11-catalogo-explicativo.json');
const catalogo = construirCatalogoExplicativo(model,fichas,puentes,recurso);
assert.equal(catalogo.base.size,7); assert.equal(catalogo.faq.size,7); assert.equal(catalogo.sub.size,2);
assert.equal(catalogo.faq.get('faq.etica.intro').componentes.length,3);
assert.equal(catalogo.faq.get('faq.lab.felicidad').componentes.length,3);
for(const ficha of fichas.fichas){
 const p=puentes.porFicha.get(ficha.id);
 const els=elementosContextoEstructural(model,fichas,puentes,ficha.id);
 const nodos=els.filter(e=>e.group==='nodes');const aristas=els.filter(e=>e.group==='edges');
 assert.equal(nodos.length, 1+p.contextos.macros.length+p.contextos.unidades.length+p.apoyos.length);
 assert.equal(aristas.length,nodos.length-1);
 const ids = new Set(nodos.map(n=>n.data.id));
 assert.equal(ids.size,nodos.length);
 for(const e of aristas){
   assert(ids.has(e.data.source)&&ids.has(e.data.target),'sin extremos inventados');
   assert(['contexto_ficha','pertenencia_estructural'].includes(e.data.tipo));
   assert.notEqual(e.data.tipo,'argumentativa_propuesta','una pertenencia no es una inferencia');
 }
 assert.equal(nodos.filter(n=>n.data.tipo==='subunidad_referida').length,p.apoyos.length,'solo pasajes expresamente escogidos');
 assert(inspectorContextoEstructuralHtml(model,fichas,puentes,ficha.id,`sub:${p.apoyos[0].sub_id}`).includes('data-arch-read'));
 assert(composicionFaqHtml(catalogo,ficha.id).includes('arch-composicion-faq'));
}
const felicidad = catalogo.sub.get('subficha.felicidad.ergon');
assert.equal(felicidad.ficha_base_id,'faq.lab.ergon');
assert(!composicionFaqHtml(catalogo,'faq.lab.felicidad').includes('<script'));
const clone = fn=>{const x=structuredClone(recurso);fn(x);return x;};
const build=v=>construirCatalogoExplicativo(model,fichas,puentes,v);
assert.throws(()=>build(clone(x=>x.fuente.revision='otra')),/revisión/);
assert.throws(()=>build(clone(x=>x.subfichas[0].ficha_base_id='ficha.fantasma')),/subficha/);
assert.throws(()=>build(clone(x=>x.subfichas[0].pasajes.push('1098a16-18'))),/subficha/);
assert.throws(()=>build(clone(x=>x.faqs[0].componentes[1].id='subficha.felicidad.ergon')),/subficha/);
assert.throws(()=>build(clone(x=>x.faqs[0].componentes.push(x.faqs[0].componentes[0]))),/composición/);
const hostile=build(clone(x=>x.subfichas[0].adaptacion='<script>alert(1)</script>'));
assert(!composicionFaqHtml(hostile,'faq.etica.intro').includes('<script'));
assert(composicionFaqHtml(hostile,'faq.etica.intro').includes('&lt;script&gt;'));
const view=fs.readFileSync(new URL('../js/views/labArchitectureView.js',import.meta.url),'utf8');
for(const item of ['elementosContextoEstructural','inspectorContextoEstructuralHtml','composicionFaqHtml','n1u11-catalogo-explicativo.json','pertenencia_estructural']) assert(view.includes(item));
assert.equal(JSON.stringify(snapshot),initial,'no se cambia la exportación');
console.log('N1-U.11 OK · 7 fichas base, 2 subfichas, 7 FAQ compuestas, respaldo estructural selectivo, HTML seguro y revisión editorial intacta.');
