import assert from 'node:assert/strict';
import { construirGrafoContextual, crearGrupoTexto, normalizarEstadoContexto, ordenTextualDe,
  claveContextoTextual } from '../js/lab/graphTextContext.js';
import { normalizarDisposicion } from '../js/lab/graphLayoutPersistence.js';

const ancla = { tipo: 'concepto', id: 'arete', nodo: 'concepto_estatico:arete' };
const unidades = [
  { id: 'u1', titulo: 'Virtud', subunidades: [{ id: 's1', titulo: 'Ejemplo', bekker: '1094a1', motivos: [] },
    { id: 's2', titulo: 'Otro', bekker: '1094a2', motivos: [] }],
    todasSubunidades: [{ id: 's1', titulo: 'Ejemplo' }, { id: 's2', titulo: 'Otro' }] },
  { id: 'u2', titulo: 'Felicidad', subunidades: [], todasSubunidades: [] },
];
const S = { tags: { unidades: [{ id: 'u1', subunidades: [{ id: 's1' }, { id: 's2' }] },
  { id: 'u2', subunidades: [] }, { id: 'u3', subunidades: [] }] } };
const opts = { ...ordenTextualDe(S), focos: ['concepto_estatico:arete','concepto_estatico:eudaimonia'],
  etiquetasFoco: { 'concepto_estatico:arete': 'Areté', 'concepto_estatico:eudaimonia': 'Felicidad' },
  aristasFoco: [{ data: { id: 'a10', source: 'concepto_estatico:arete', target: 'concepto_estatico:eudaimonia', relacion: 'condicion' } }] };
const base = normalizarEstadoContexto({ unidadesAbiertas: ['u1'] });
let graph = construirGrafoContextual(ancla, 'Areté', unidades, base, opts);
const nodes = () => graph.elementos.filter(e => e.group === 'nodes');
const edges = () => graph.elementos.filter(e => e.group === 'edges');
assert.equal(nodes().filter(n => n.data.anclaContextual).length, 1);
assert.equal(nodes().filter(n => n.data.orientativo).length, 2);
const rela = edges().find(e => e.data.id === 'texto:orientativo:arista:a10');
assert.equal(rela.data.nombreAristaVisible, 'condicion');
assert.equal(rela.data.source, 'texto:orientativo:concepto_estatico:arete');
assert.equal(rela.data.target, 'texto:orientativo:concepto_estatico:eudaimonia');
assert.equal(edges().find(e => e.data.source === 'texto:unidad:u1' && e.data.target === 'texto:subunidad:s1').data.nombreAristaVisible, 'contiene');
assert.equal(edges().find(e => e.data.source === 'texto:unidad:u1' && e.data.target === 'texto:unidad:u2').data.nombreAristaVisible, 'sigue en texto');
assert.ok(!edges().some(e => e.data.target === 'texto:unidad:u3'));
assert.equal(edges().find(e => e.data.source === 'texto:subunidad:s1' && e.data.target === 'texto:subunidad:s2').data.nombreAristaVisible, 'continúa');
assert.equal(nodes().length, 7); // ancla, 2 focos de orientación, 2 unidades, 2 subunidades
const group = crearGrupoTexto(base, 'Contextos secundarios', ['texto:unidad:u1']);
assert.ok(group);assert.equal(group.grupos.length, 1);
assert.equal(crearGrupoTexto(group, 'Repetido', ['texto:unidad:u1']), null);
graph = construirGrafoContextual(ancla, 'Areté', unidades, group, opts);
assert.ok(nodes().some(n => n.data.grupoUsuario));
assert.ok(!nodes().some(n => n.data.id === 'texto:unidad:u1'));
assert.ok(!nodes().some(n => n.data.id === 'texto:subunidad:s1')); // no queda hijo suelto
assert.ok(!edges().some(e => e.data.source === 'texto:unidad:u1'));
const expanded = normalizarEstadoContexto({ ...group, gruposAbiertos: [group.grupos[0].id],
  posiciones: { 'texto:unidad:u1': { x: 432, y: 89 }, 'texto:grupo:g1': { x: 250, y: 0 } } });
graph = construirGrafoContextual(ancla, 'Areté', unidades, expanded, opts);
assert.ok(nodes().some(n => n.data.id === 'texto:unidad:u1'));
assert.equal(expanded.posiciones['texto:unidad:u1'].x, 432);
const saved = normalizarDisposicion({ exploradoresTexto: { [claveContextoTextual(ancla)]: expanded } });
assert.equal(saved.exploradoresTexto['concepto:arete'].grupos[0].titulo, 'Contextos secundarios');
assert.equal(saved.exploradoresTexto['concepto:arete'].posiciones['texto:unidad:u1'].x, 432);
assert.equal(saved.exploradoresTexto['concepto:arete'].gruposAbiertos[0], 'g1');
assert.equal(normalizarEstadoContexto({ grupos: [{ id: 'x<>', titulo: 'Invalido', miembros: ['texto:unidad:u1'] }] }).grupos.length, 0);
console.log('OK: 9A.2 aristas documentales dirigidas, sucesión textual, focos orientativos, grupos y persistencia.');
