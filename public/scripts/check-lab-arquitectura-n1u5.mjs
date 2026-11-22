import assert from 'node:assert/strict';
import fs from 'node:fs';
import { construirModeloArquitectura } from '../js/lab/architectureModel.js';
import { construirRelacionesProemio } from '../js/lab/architectureRelations.js';
import { construirCapasProemio } from '../js/lab/architectureLayers.js';
import { construirFichasArquitectura, elementosFichaFAQ, fichaIntroHtml, inspectorFichaFAQHtml } from '../js/lab/architectureCards.js';
const read = relative => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const lectura = read('./fixtures/n1u2-unidades.json');
const instantanea = JSON.stringify(lectura);
const modelo = construirModeloArquitectura(lectura, read('../lab/n1u1-propuestas-libro-i.json'));
const rel = construirRelacionesProemio(modelo, read('../lab/n1u3-relaciones-proemio.json'));
const capas = construirCapasProemio(modelo, rel, read('../lab/n1u4-modulos-proemio.json'));
const recurso = read('../lab/n1u5-fichas-explicativas.json');
const fichas = construirFichasArquitectura(modelo, capas, recurso);
assert.equal(fichas.fichas.length, 3);
assert.deepEqual(fichas.fichas.map(x => x.id), ['proemio', 'faq.etica.intro', 'faq.agathon.pros_hen']);
assert(fichaIntroHtml(fichas.porId.get('proemio')).includes('Producción') || fichaIntroHtml(fichas.porId.get('proemio')).includes('producción'));
assert(fichaIntroHtml(fichas.porId.get('proemio')).includes('propuesta') || fichaIntroHtml(fichas.porId.get('proemio')).includes('propuestas'));
assert.equal(fichas.porId.get('proemio').tipo, 'proemio');
assert.deepEqual(fichas.fichas.slice(1).map(x => x.pasos.length), [6, 4]);
for (const faq of fichas.fichas.slice(1)) {
  const graf = elementosFichaFAQ(faq, modelo, { pasoId: 'p2', enlaceId: 'p1->p2' });
  const nodes = graf.filter(e => e.group === 'nodes');
  const edges = graf.filter(e => e.group === 'edges');
  assert.equal(nodes.length, faq.pasos.length);
  assert.equal(edges.length, faq.pasos.length - 1);
  assert.equal(nodes.find(x => x.data.key === 'p2').data.seleccionado, 1);
  assert.equal(edges.find(x => x.data.key === 'p1->p2').data.seleccionado, 1);
  const idSet = new Set(nodes.map(n => n.data.id));
  for (const edge of edges) {
    assert(idSet.has(edge.data.source) && idSet.has(edge.data.target));
    assert.equal(edge.data.tipo, 'orden_trayecto', 'una transición FAQ nunca se convierte en relación argumentativa');
  }
  assert(inspectorFichaFAQHtml(faq, modelo, 'p1', null).includes('data-arch-read'));
  assert(inspectorFichaFAQHtml(faq, modelo, null, 'p1->p2').includes('no una inferencia demostrada'));
  assert(inspectorFichaFAQHtml(faq, modelo, null, null).includes('data-arch-card-link'));
}
assert(fichaIntroHtml({ titulo: '<img src=x onerror=alert(1)>', introduccion: ['<script>'], lectura_grafo: ['<b>'], referencias: ['x'], nota: 'x' }).includes('&lt;img'));
assert(!fichaIntroHtml({ titulo: '<img>', introduccion: ['<script>'], lectura_grafo: ['x'], referencias: ['x'], nota: 'x' }).includes('<script>'));
const bad = mut => { const copy = structuredClone(recurso); mut(copy); return copy; };
assert.throws(() => construirFichasArquitectura(modelo, capas, bad(x => x.fuente.revision = 'revision-nueva')), /revisión editorial distinta/);
assert.throws(() => construirFichasArquitectura(modelo, capas, bad(x => x.fichas[1].pasos[0].sub_id = 'inexistente')), /paso de FAQ/);
assert.throws(() => construirFichasArquitectura(modelo, capas, bad(x => x.fichas[2].transiciones.pop())), /cantidad de pasos/);
assert.throws(() => construirFichasArquitectura(modelo, capas, bad(x => x.fichas[1].fuente_editorial.trayecto_id = 'otro')), /identidad editorial/);
assert.equal(JSON.stringify(lectura), instantanea, 'la fuente canónica no debe mutar');
console.log('N1-U.5 OK: tres fichas (Proemio, 6 pasos de Ética, 4 pasos del bien); enlaces FAQ de secuencia, lecturas, revisión y salida HTML segura.');
