import assert from 'node:assert/strict';
import { iniciarOrientacion, siguientePregunta, responderOrientacion, sugerirRelaciones } from '../js/lab/orientador.js';

const S = {
  N: { phusis: { label: 'Naturaleza' }, eudaimonia: { label: 'Felicidad' }, arete: { label: 'Excelencia' }, hexis: { label: 'Disposición' } },
  FN: { naturaleza_func: { label: 'Naturaleza funcional', remite_a: ['phusis#sentido'] }, arete: { label: 'Excelencia' }, eudaimonia: { label: 'Felicidad' }, hexis: { label: 'Disposición' } },
  FE: [
    { de: 'naturaleza_func', a: 'arete', rel: 'condicion', ref: '1097a' },
    { de: 'eudaimonia', a: 'naturaleza_func', rel: 'contraste', ref: '1098b' },
    { de: 'hexis', a: 'arete', rel: 'perfecciona' },
  ],
};
const inicio = iniciarOrientacion('Quiero comprender la naturaleza y su relación con la felicidad');
assert.deepEqual(inicio.analisis.conceptosDetectados, ['phusis', 'eudaimonia']);
assert.equal(inicio.consulta.tema, null);
const tema = siguientePregunta(inicio, S);
assert.equal(tema.clave, 'tema');
assert.deepEqual(tema.opciones.slice(0, 2).map(o => o.valor), ['phusis','eudaimonia']);
assert.ok(tema.opciones.slice(0,2).every(o => o.fuente === 'pregunta_inicial'));
const a = responderOrientacion(inicio,'phusis',S);
const b = responderOrientacion(a,'relacionar',S);
// Los conceptos ya mencionados no se vuelven a preguntar como destinos nuevos.
assert.deepEqual(b.consulta.conceptosRelacionados, ['eudaimonia']);
assert.equal(b.consulta.destino, null);
assert.equal(siguientePregunta(b, S).clave, 'nivel');
assert.deepEqual(inicio.consulta.conceptosRelacionados, [], 'La sesión inicial no se modifica');
// Si la pregunta inicial nombra un único concepto y el estudiante decide
// relacionarlo, las sugerencias sí proceden del grafo con su fuente y dirección.
const desdeUno = iniciarOrientacion('Quiero comprender la naturaleza');
const conRelacion = responderOrientacion(desdeUno, 'relacionar', S);
const destino = siguientePregunta(conRelacion,S);
assert.equal(destino.clave,'destino');
const virtud = destino.opciones.find(o => o.valor === 'arete');
assert.equal(virtud.fuente,'arista_funcional');
assert.equal(virtud.direccion,'saliente');
assert.equal(virtud.de,'naturaleza_func');
assert.equal(virtud.a,'arete');
assert.equal(virtud.ref,'1097a');
assert.equal(destino.opciones.some(o => o.valor === 'hexis'), false, 'No se proponen dos saltos como vecinos');
const rel = sugerirRelaciones(S,'phusis');
assert.equal(rel.find(o=>o.valor==='eudaimonia').direccion,'entrante');
assert.equal(rel.find(o=>o.valor==='eudaimonia').de,'eudaimonia');
assert.equal(rel.find(o=>o.valor==='eudaimonia').a,'naturaleza_func');
assert.equal(sugerirRelaciones({ FE: [] },'phusis').length,0);
const elegido = responderOrientacion(conRelacion,'arete',S);
assert.equal(elegido.bitacora.at(-1).datos.opcion.fuente, 'arista_funcional');
assert.equal(elegido.consulta.destino,'arete');
assert.equal(conRelacion.consulta.destino,null);
console.log('OK: conceptos reconocidos, sugerencias de un salto, dirección, procedencia e historial.');
