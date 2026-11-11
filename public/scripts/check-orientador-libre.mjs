import assert from 'node:assert/strict';
import { iniciarOrientacion, responderOrientacion, responderLibre, buscarConceptos, siguientePregunta } from '../js/lab/orientador.js';
const S = {
  N: { phusis: { label: 'Naturaleza', gr: 'phýsis' }, eudaimonia: { label: 'Felicidad', gr: 'eudaimonía' } },
  FN: { arete: { label: 'Excelencia', gr: 'areté' }, phusis: { label: 'Naturaleza' } },
  FE: [{ de: 'phusis', a: 'arete', rel: 'impulso', ref: 'EN I' }],
};
const x = iniciarOrientacion('Quiero comprender la naturaleza');
const y = responderOrientacion(x, 'relacionar', S);
assert.equal(siguientePregunta(y, S).clave, 'destino');
const search = buscarConceptos(S, 'aret', 'phusis');
assert.equal(search[0].valor, 'arete');
assert.equal(search[0].vinculo.direccion, 'saliente');
assert.equal(buscarConceptos(S, 'physis', 'phusis').length, 0);
const chosen = responderLibre(y, 'areté', S, 'arete');
assert.equal(chosen.consulta.destino, 'arete');
assert.equal(chosen.bitacora.at(-1).datos.opcion.fuente, 'catalogo_conceptos');
assert.equal(chosen.bitacora.at(-1).datos.opcion.vinculo.ref, 'EN I');
assert.equal(responderLibre(y, 'Excelencia', S).consulta.destino, 'arete', 'Coincidencia literal se resuelve como nodo');
const other = responderLibre(y, 'Relación con una vivencia todavía sin catalogar', S);
assert.equal(other.consulta.destino, 'Relación con una vivencia todavía sin catalogar');
assert.equal(other.bitacora.at(-1).datos.opcion.fuente, 'texto_libre');
assert.equal(other.bitacora.at(-1).datos.opcion.sinCoincidencia, true);
assert.equal(y.consulta.destino, null);
assert.throws(() => responderLibre(y, ' '), /Escribí/);
assert.throws(() => responderLibre(y, 'areté', S, 'inventado'), /inválido/);
console.log('OK: Otra, autocompletado, arista dirigida y registro literal del texto libre.');
