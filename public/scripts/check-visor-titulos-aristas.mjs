import assert from 'node:assert/strict';
import {
  huellaGrafo, claveDisposicion, decorarAristasFocales, normalizarDisposicion,
  normalizarTituloArista, guardarDisposicion, leerDisposicion, MAX_TITULO_ARISTA,
} from '../js/lab/graphLayoutPersistence.js';
import { indexarGrafo, crearEstadoFocal, alternarExpansion, obtenerSubgrafoFocal } from '../js/lab/graphFocusExpansion.js';

const node = (id, tipo = 'concepto_estatico') => ({ group: 'nodes', data: { id, tipo, label: id } });
const edge = (id, source, target, tipo, relacion = '') => ({
  group: 'edges', data: { id, source, target, tipo, relacion, fuente: 'fuente-editorial', referencia: 'EN I.7' },
});
const corpus = [node('arete'), node('eudaimonia'), node('faq:virtud', 'faq'), node('hexis'), node('dunamis'),
  edge('condicion', 'arete', 'eudaimonia', 'arista_funcional', 'condicion'),
  edge('pregunta', 'faq:virtud', 'arete', 'foco_faq'),
  edge('disposicion', 'arete', 'hexis', 'arista_funcional', 'disposicion'),
  edge('potencia', 'hexis', 'dunamis', 'arista_funcional', 'potencia')];
const original = JSON.stringify(corpus);
const focos = ['arete', 'eudaimonia'];
const estado = crearEstadoFocal(indexarGrafo(corpus), focos);
const base = obtenerSubgrafoFocal(estado).elementos;
const byId = (items, id) => items.find(e => e.data.id === id);

const inicial = decorarAristasFocales(base, focos);
assert.equal(byId(inicial, 'condicion').data.conexionFocos, 1, 'directa entre focos');
assert.equal(byId(inicial, 'condicion').data.nombreAristaVisible, '', 'sin etiqueta automática ni siquiera entre focos');
assert.equal(byId(inicial, 'pregunta').data.nombreAristaVisible, '', 'no repetir foco_faq en el lienzo');
assert.equal(byId(inicial, 'pregunta').data.tipo, 'foco_faq', 'el tipo original se conserva');

const pref = { todasEtiquetas: false, etiquetas: ['pregunta', 'condicion'], titulos: {
  pregunta: '¿Qué es la virtud?', condicion: 'La virtud es condición de felicidad',
} };
const visible = decorarAristasFocales(base, focos, pref);
assert.equal(byId(visible, 'pregunta').data.nombreAristaVisible, '¿Qué es la virtud?');
assert.equal(byId(visible, 'condicion').data.nombreAristaVisible, 'La virtud es condición de felicidad');
assert.equal(byId(visible, 'disposicion').data.nombreAristaVisible, '', 'otras aristas siguen ocultas');
assert.equal(JSON.stringify(corpus), original, 'no se modifica la fuente editorial');

const ocultas = decorarAristasFocales(base, focos, { ...pref, etiquetas: [] });
assert.equal(byId(ocultas, 'pregunta').data.nombreAristaVisible, '', 'ocultar no borra título personalizado');
const reabiertas = decorarAristasFocales(base, focos, pref);
assert.equal(byId(reabiertas, 'pregunta').data.nombreAristaVisible, '¿Qué es la virtud?');
const todas = decorarAristasFocales(base, focos, { ...pref, todasEtiquetas: true });
assert.equal(byId(todas, 'disposicion').data.nombreAristaVisible, 'disposicion', 'modo voluntario todas');
const sinTitulo = decorarAristasFocales(base, focos, { etiquetas: ['pregunta'], titulos: {} });
assert.equal(byId(sinTitulo, 'pregunta').data.nombreAristaVisible, 'foco_faq', 'restablecer usa nombre editorial sin cambiarlo');
const expandido = obtenerSubgrafoFocal(alternarExpansion(estado, 'hexis')).elementos;
assert.ok(expandido.some(e => e.data.id === 'potencia'), 'la expansión mantiene sus relaciones');
assert.equal(decorarAristasFocales(expandido, focos, { etiquetas: ['potencia'], titulos: { potencia: 'Potencia' } })
  .find(e => e.data.id === 'potencia').data.nombreAristaVisible, 'Potencia');

assert.equal(normalizarTituloArista('  Virtud  \n como   condición '), 'Virtud como condición');
assert.equal(normalizarTituloArista('  \n  '), '');
assert.equal(normalizarTituloArista(12), '');
assert.equal(normalizarTituloArista('a'.repeat(500)).length, MAX_TITULO_ARISTA);
const old = normalizarDisposicion({ etiquetas: ['pregunta'], posiciones: {arete:{x:1,y:2}} });
assert.deepEqual(old.titulos, {}, 'compatibilidad con el Checkpoint 5');
assert.deepEqual(old.etiquetas, ['pregunta']);
assert.deepEqual(normalizarDisposicion({titulos:{pregunta:'  Título breve  ', vacia:'\n', mal:4}}).titulos,
  {pregunta:'Título breve'}, 'solo títulos válidos');
const db = new Map();
const storage = {getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v)};
const key = claveDisposicion(focos, huellaGrafo(corpus));
assert.equal(guardarDisposicion(storage, key, {...pref, posiciones:{arete:{x:123,y:456}}}), true);
assert.deepEqual(leerDisposicion(storage, key).titulos, pref.titulos);
assert.deepEqual(leerDisposicion(storage, key).etiquetas, pref.etiquetas);
assert.deepEqual(leerDisposicion(storage, key).posiciones.arete, {x:123,y:456});
assert.equal(claveDisposicion([...focos].reverse(),huellaGrafo(corpus)),key);
assert.equal(leerDisposicion(storage,claveDisposicion(focos,huellaGrafo([...corpus.slice(0,-1)]))), null,
  'al cambiar la estructura documental no se reaplica un título sobre otra arista');
console.log('OK: títulos personalizados por ID, visibilidad selectiva, FAQ, expansiones, guardado y compatibilidad C5.');
