import assert from 'node:assert/strict';
import fs from 'node:fs';
import { construirModeloArquitectura } from '../js/lab/architectureModel.js';
import { construirRelacionesProemio } from '../js/lab/architectureRelations.js';
import { construirCapasProemio, elementosCapaBasica, elementosCapaDetallada } from '../js/lab/architectureLayers.js';

const file = relative => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
const lectura = file('./fixtures/n1u2-unidades.json');
const snapshot = JSON.stringify(lectura);
const modelo = construirModeloArquitectura(lectura, file('../lab/n1u1-propuestas-libro-i.json'));
const relaciones = construirRelacionesProemio(modelo, file('../lab/n1u3-relaciones-proemio.json'));
const propuesta = file('../lab/n1u4-modulos-proemio.json');
const capas = construirCapasProemio(modelo, relaciones, propuesta);

assert.deepEqual(capas.modulos.map(m => m.subIds.length), [3, 2, 2, 5]);
assert.equal(capas.modulos.length, 4);
assert.equal(capas.porSub.size, 12);
assert.equal(capas.enlaces.length, 3);
assert.deepEqual(capas.enlaces.map(e => [e.id, ...e.relacionIds]), [
  ['A->B', 'r03'], ['B->C', 'r05'], ['C->D', 'r07'],
]);
assert.equal([...capas.internas.values()].flat().length, 7);
assert.deepEqual([...capas.internas.values()].flat().sort(), ['r01', 'r02', 'r04', 'r06', 'r08', 'r09', 'r10']);
assert.equal(new Set([...capas.enlaces.flatMap(x => x.relacionIds), ...[...capas.internas.values()].flat()]).size, 10);
assert(capas.porId.get('C').funcion.includes('sin dar por demostrada'));
const sintetica = elementosCapaBasica(capas, { moduloId: 'B', enlaceId: 'A->B' });
assert.equal(sintetica.filter(e => e.group === 'nodes').length, 4);
assert.equal(sintetica.filter(e => e.group === 'edges').length, 3);
assert(sintetica.find(e => e.data.id === 'modulo:B').data.seleccionado === 1);
assert(sintetica.find(e => e.data.id === 'enlace:A->B').data.seleccionado === 1);
const detalle = elementosCapaDetallada(modelo, capas, { relacionId: 'r05', subId: '1094a18-22' });
assert.equal(detalle.filter(e => e.group === 'nodes' && e.data.tipo === 'modulo_contenedor').length, 4);
assert.equal(detalle.filter(e => e.group === 'nodes' && e.data.tipo === 'subunidad').length, 12);
assert.equal(detalle.filter(e => e.group === 'edges').length, 10);
assert.equal(detalle.find(e => e.data.id === 'rel:r05').data.seleccionado, 1);
assert.equal(detalle.find(e => e.data.id === 'sub:1094a18-22').data.parent, 'contenedor:C');
for (const edge of [...sintetica, ...detalle].filter(e => e.group === 'edges')) {
  const elements = edge.data.tipo === 'argumentativa_resumida' ? sintetica : detalle;
  assert(elements.some(n => n.data.id === edge.data.source), edge.data.source);
  assert(elements.some(n => n.data.id === edge.data.target), edge.data.target);
}
const invalid = change => { const copy = structuredClone(propuesta); change(copy); return copy; };
assert.throws(() => construirCapasProemio(modelo, relaciones, invalid(p => { p.fuente.revision = 'otra'; })), /revisión distinta/);
assert.throws(() => construirCapasProemio(modelo, relaciones, invalid(p => { p.estado = 'validado'; })), /módulos propuestos/);
assert.throws(() => construirCapasProemio(modelo, relaciones, invalid(p => { p.modulos[0].sub_ids.pop(); })), /no coinciden/);
assert.throws(() => construirCapasProemio(modelo, relaciones, invalid(p => { p.modulos[0].id = 'B'; })), /módulo repetido/);
assert.throws(() => construirCapasProemio(modelo, relaciones, invalid(p => { p.modulos[0].momento_id = 'n1u:metodo:I'; })), /momento propuesto no encontrado/);
assert.equal(JSON.stringify(lectura), snapshot, 'lectura canónica no debe modificarse');
console.log('N1-U.4 OK: 4 módulos / 3 enlaces trazables (capa 1); 12 subunidades / 10 aristas (capa 2); revisión, cobertura y solo lectura.');
