import assert from 'node:assert/strict';
import fs from 'node:fs';
import { construirModeloArquitectura, obtenerContexto, elementosArquitectura } from '../js/lab/architectureModel.js';
import { construirRelacionesProemio, elementosRelacionesProemio } from '../js/lab/architectureRelations.js';

const file = url => JSON.parse(fs.readFileSync(new URL(url, import.meta.url), 'utf8'));
const lectura = file('./fixtures/n1u2-unidades.json');
const momentos = file('../lab/n1u1-propuestas-libro-i.json');
const propuesta = file('../lab/n1u3-relaciones-proemio.json');
const before = JSON.stringify(lectura);
const modelo = construirModeloArquitectura(lectura, momentos);
const relaciones = construirRelacionesProemio(modelo, propuesta);
assert.equal(relaciones.relaciones.length, 10);
assert.equal(relaciones.subIds.length, 12);
assert.equal(relaciones.relaciones[0].nombre, 'distingue formas de fin');
assert(relaciones.relaciones.some(r => r.nombre === 'ordena fines'));
assert(relaciones.relaciones.some(r => r.nombre === 'plantea el fin último'));
assert(relaciones.relaciones.some(r => r.nombre === 'identifica el saber rector'));
assert(relaciones.relaciones.every(r => r.estado === 'propuesta_no_validada' && r.fundamento.length > 40));
const elementos = elementosRelacionesProemio(modelo, relaciones, { relacionId: 'r03', subId: null });
assert.equal(elementos.filter(e => e.group === 'nodes').length, 12);
assert.equal(elementos.filter(e => e.group === 'edges').length, 10);
assert(elementos.filter(e => e.group === 'edges').every(e => e.data.tipo === 'argumentativa_propuesta'));
assert(elementos.some(e => e.data.id === 'sub:1094b10-11'));
assert(elementos.find(e => e.data.id === 'rel:r03').data.seleccionado === 1);
for (const e of elementos.filter(e => e.group === 'edges')) {
  assert(elementos.some(n => n.data.id === e.data.source));
  assert(elementos.some(n => n.data.id === e.data.target));
}
assert.equal(obtenerContexto(modelo, { macroId: 'macro:I-V', unidadId: 'proemio', momentoId: null, subId: null }).momentos.length, 4);
assert(elementosArquitectura(modelo, { macroId: 'macro:VI-VII', unidadId: 'idea_bien', momentoId: null, subId: null }).every(e => e.data.tipo !== 'argumentativa_propuesta'));
assert.equal(JSON.stringify(lectura), before, 'los tags canónicos deben quedar intactos');

const invalid = change => { const p = structuredClone(propuesta); change(p); return p; };
assert.throws(() => construirRelacionesProemio(modelo, invalid(p => { p.fuente.revision = 'otra'; })), /revisión distinta/);
assert.throws(() => construirRelacionesProemio(modelo, invalid(p => { p.relaciones[0].a = '1095a2-6'; })), /extremos inválidos/);
assert.throws(() => construirRelacionesProemio(modelo, invalid(p => { p.relaciones[0].a = p.relaciones[0].de; })), /extremos inválidos/);
assert.throws(() => construirRelacionesProemio(modelo, invalid(p => { p.relaciones[1].id = 'r01'; })), /id vacío o repetido/);
assert.throws(() => construirRelacionesProemio(modelo, invalid(p => { p.relaciones[1].de = p.relaciones[0].de; p.relaciones[1].a = p.relaciones[0].a; })), /arista duplicada/);
assert.throws(() => construirRelacionesProemio(modelo, invalid(p => { p.relaciones[1].estado = 'validado'; })), /no se puede elevar/);
assert.throws(() => construirRelacionesProemio(modelo, invalid(p => { p.relaciones[1].tipo = 'secuencia_inferida'; })), /semántica incompleta/);
console.log('N1-U.3 OK: 12 subunidades visibles, 10 aristas propuestas con dirección y fundamento, selección, integridad, revisión y read-only.');
