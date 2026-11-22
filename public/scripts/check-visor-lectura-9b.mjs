import assert from 'node:assert/strict';
import { localizarSubunidadEnBiblioteca, representarLecturaContextual } from '../js/lab/graphPassageReader.js';
import { buildLibrary, parseBook } from '../js/reader/text.js';

const fixture = `1
──
{"parrafo_nro":1}
La virtud nos importa.
ἡ ἀρετὴ σπουδαία.
{"parrafo_nro":2}
El bien se dice de varias maneras.
τὸ ἀγαθὸν πολλαχῶς λέγεται.
2
──
{"parrafo_nro":3}
La naturaleza cuenta.
ἡ φύσις ἀρχή.`;
const S = { repo: { libroTagueado: () => 'I' }, SUB: {
  arete: { id: 'arete', titulo: 'Virtud', bekker: ['1094a1','1094a3'],
    es_ancla: { inicio: 'La virtud', fin: 'nos importa.' }, gr_ancla: { inicio: 'ἡ ἀρετὴ', fin: 'σπουδαία.' } },
  incompleta: { id: 'incompleta', titulo: 'Solo castellano', bekker: ['1094a1','1094a3'],
    es_ancla: { inicio: 'La virtud', fin: 'nos importa.' }, gr_ancla: { inicio: 'no existe', fin: 'tampoco' } },
  rota: { id: 'rota', titulo: 'Sin localización', bekker: ['1094a1','1094a3'],
    es_ancla: { inicio: 'desconocido', fin: 'inexistente' }, gr_ancla: { inicio: 'not here', fin: 'impossible' } },
} };
const library = buildLibrary([parseBook(fixture)], S);
const found = localizarSubunidadEnBiblioteca(library, 'arete');
assert.equal(found.ok, true);
assert.equal(found.idiomas.es, true);
assert.equal(found.idiomas.gr, true);
const display = representarLecturaContextual(found);
assert.equal(display.highlighted, true);
assert.match(display.passageHtml, /reader-highlight/);
assert.match(display.passageHtml, /La virtud/);
assert.match(display.passageHtml, /τὸ ἀγαθὸν/); // contexto del capítulo, sin perder su texto
assert.ok(display.passageHtml.includes('reader-paragraph--selected'));
const next = representarLecturaContextual(found, 2);
assert.equal(next.highlighted, false);
assert.ok(!next.passageHtml.includes('reader-paragraph--selected'));
assert.match(next.passageHtml, /La naturaleza/);
const partial = localizarSubunidadEnBiblioteca(library, 'incompleta');
assert.equal(partial.ok, true);
assert.equal(partial.idiomas.es, true);
assert.equal(partial.idiomas.gr, false);
assert.match(representarLecturaContextual(partial).message, /griego/);
const missing = localizarSubunidadEnBiblioteca(library, 'rota');
assert.equal(missing.ok, false);
assert.match(missing.motivo, /anclas/i);
assert.equal(localizarSubunidadEnBiblioteca(library, 'sin-id').ok, false);
console.log('OK: 9B localización exacta, griego/castellano, contexto completo, navegación y anclas ausentes.');
