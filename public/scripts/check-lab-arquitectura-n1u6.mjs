import assert from 'node:assert/strict';
import fs from 'node:fs';
import { construirModeloArquitectura } from '../js/lab/architectureModel.js';
import { construirRelacionesProemio } from '../js/lab/architectureRelations.js';
import { construirCapasProemio } from '../js/lab/architectureLayers.js';
import { construirFichasArquitectura } from '../js/lab/architectureCards.js';
import { construirPuentesExplicativos, elementosPuentes, inspectorPuentesHtml } from '../js/lab/architectureBridges.js';
const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const fuente = read('./fixtures/n1u2-unidades.json');
const snapshot = JSON.stringify(fuente);
const model = construirModeloArquitectura(fuente, read('../lab/n1u1-propuestas-libro-i.json'));
const rel = construirRelacionesProemio(model, read('../lab/n1u3-relaciones-proemio.json'));
const capas = construirCapasProemio(model, rel, read('../lab/n1u4-modulos-proemio.json'));
const fichas = construirFichasArquitectura(model, capas, read('../lab/n1u5-fichas-explicativas.json'));
const json = read('../lab/n1u6-puentes-explicativos.json');
const puentes = construirPuentesExplicativos(model, fichas, json);
assert.equal(puentes.porFicha.size, 3);
for (const ficha of fichas.fichas) {
  const p = puentes.porFicha.get(ficha.id);
  assert(p?.contextos?.macros?.length && p?.contextos?.unidades?.length && p?.apoyos?.length);
  for (const [vista, expected] of [['orientacion', 1 + p.contextos.macros.length + p.contextos.unidades.length], ['apoyos', 1 + p.apoyos.length]]) {
    const elements = elementosPuentes(model, fichas, puentes, ficha.id, vista, { id: 'sub:1096b26-31' });
    assert.equal(elements.filter(e => e.group === 'nodes').length, expected);
    assert.equal(elements.filter(e => e.group === 'edges').length, expected - 1);
    const ids = new Set(elements.filter(e => e.group === 'nodes').map(e => e.data.id));
    for (const edge of elements.filter(e => e.group === 'edges')) {
      assert.equal(edge.data.source, `puente:ficha:${ficha.id}`, 'las aristas siempre parten de la ficha');
      assert(ids.has(edge.data.source) && ids.has(edge.data.target));
      assert.equal(edge.data.tipo, vista === 'orientacion' ? 'contexto_ficha' : 'respaldo_textual');
      assert.notEqual(edge.data.tipo, 'contiene', 'no hay conexión mecánica de subunidad a unidad');
    }
  }
  assert(inspectorPuentesHtml(model, fichas, puentes, ficha.id, 'orientacion').includes('Ubicaciones relevantes'));
  assert(inspectorPuentesHtml(model, fichas, puentes, ficha.id, 'apoyos', `sub:${p.apoyos[0].sub_id}`).includes('data-arch-read'));
  assert.equal(p.apoyos.length, ficha.tipo === 'proemio' ? 4 : ficha.pasos.length);
  if (ficha.tipo === 'faq') assert.deepEqual(p.apoyos.map(a => a.sub_id), ficha.pasos.map(x => x.sub_id));
}
const variant = update => { const obj = structuredClone(json); update(obj); return obj; };
assert.throws(() => construirPuentesExplicativos(model, fichas, variant(j => j.fuente.revision = 'otra')), /revisión/);
assert.throws(() => construirPuentesExplicativos(model, fichas, variant(j => j.puentes[0].apoyos[0].sub_id = 'inexistente')), /apoyo textual/);
assert.throws(() => construirPuentesExplicativos(model, fichas, variant(j => j.puentes[1].apoyos[0].paso_id = 'p3')), /no coinciden/);
assert.throws(() => construirPuentesExplicativos(model, fichas, variant(j => j.puentes[0].contextos.unidades[0].id = 'idea_bien')), /unidad sin macrounidad/);
assert.throws(() => construirPuentesExplicativos(model, fichas, variant(j => j.puentes[0].apoyos[0].explicacion = '')), /apoyo textual/);
const copy = variant(j => j.puentes[0].apoyos[0].rol = '<img src=x onerror=alert(1)>');
const puentesXss = construirPuentesExplicativos(model, fichas, copy);
assert(!inspectorPuentesHtml(model, fichas, puentesXss, 'proemio', 'apoyos', 'sub:1094a1-3').includes('<img'));
assert.equal(JSON.stringify(fuente), snapshot, 'no se modifica el paquete de MariaDB');
console.log('N1-U.6 OK: tres fichas → macrounidades/unidades elegidas y respaldos directos; sin enlaces mecánicos; integridad y HTML seguro.');
