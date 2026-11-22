import assert from 'node:assert/strict';
import { interpretarInquietud, definicionesDisponibles } from '../js/lab/sentidos.js';
import { iniciarOrientacion, siguientePregunta, responderOrientacion, responderLibre, precisarSentido } from '../js/lab/orientador.js';

const diferencia = interpretarInquietud('¿Cuáles son las diferencias entre disposición, virtud y felicidad?');
assert.deepEqual(diferencia.conceptos, ['hexis', 'arete', 'eudaimonia']);
assert.equal(diferencia.operacion, 'distinguir');
assert.equal(diferencia.forma, 'comparacion_multiple');
assert.equal(diferencia.relacionesSolicitadas.length, 3);
assert.ok(diferencia.relacionesSolicitadas.every(r => r.estado === 'solicitada_no_verificada'));
assert.ok(diferencia.relacionesSolicitadas.every(r => r.dirigida === false));

const evaluacion = interpretarInquietud('¿Cuál es la mejor de las virtudes?');
assert.equal(evaluacion.operacion, 'evaluar');
assert.equal(evaluacion.precision, 'cualidad');
assert.deepEqual(evaluacion.conceptos, ['arete']);
assert.equal(evaluacion.criterioEvaluacion, 'no_precisado');
const inicio = iniciarOrientacion('¿Cuál es la mejor de las virtudes?');
assert.equal(inicio.consulta.tema, 'arete');
assert.equal(siguientePregunta(inicio).opciones[0].valor, 'evaluar');

assert.equal(interpretarInquietud('¿Qué es la virtud?').precision, 'definicion');
assert.equal(interpretarInquietud('¿Qué cualidades tiene la virtud?').precision, 'cualidad');
assert.equal(interpretarInquietud('¿Cómo se adquiere la virtud?').operacion, 'explicar_genesis');
const causal = interpretarInquietud('¿Por qué la naturaleza es origen del movimiento?');
assert.equal(causal.operacion, 'justificar');
assert.ok(causal.indicios.some(i => i.funcion === 'relacion_causal_sugerida'));
assert.equal(causal.relacionesSolicitadas.length, 0, 'No inventa una arista causal');

const antes = iniciarOrientacion('¿Cuáles son las diferencias entre disposición, virtud y felicidad?');
const tema = siguientePregunta(antes);
assert.deepEqual(tema.opciones.map(o => o.valor), ['hexis','arete','eudaimonia'], 'No añadir conceptos no mencionados');
assert.match(tema.texto, /por cuál de los conceptos mencionados/i);
const otra = responderLibre(antes, 'Prudencia', { N: { phronesis: { label: 'Prudencia' } } }, 'phronesis');
assert.equal(otra.consulta.tema, 'phronesis');
assert.equal(otra.textoInicial, antes.textoInicial, 'Otro concepto no implica reescribir la pregunta');
assert.deepEqual(otra.interpretacion.conceptos, ['hexis', 'arete', 'eudaimonia']);
const a = responderOrientacion(antes, 'hexis');
assert.equal(siguientePregunta(a).opciones[0].valor, 'distinguir');
assert.match(siguientePregunta(a).opciones[0].etiqueta, /arete|areté|virtud|excelencia/i);
assert.match(siguientePregunta(a).opciones[0].etiqueta, /eudaimonia|eudaimonía|felicidad/i);
const b = responderOrientacion(a, 'distinguir');
assert.equal(siguientePregunta(b).clave, 'nivel', 'No re-preguntar lo que ya figura en la inquietud');
assert.deepEqual(b.consulta.conceptosRelacionados, ['arete', 'eudaimonia']);
assert.equal(b.consulta.destino, null);
assert.deepEqual(a.consulta.conceptosRelacionados, [], 'La selección no modifica sesiones anteriores');
const c = precisarSentido(b, 'Disposición entendida como hábito adquirido');
assert.equal(c.aclaracionSentido, 'Disposición entendida como hábito adquirido');
assert.equal(b.aclaracionSentido, null, 'La sesión previa sigue inmutable');
assert.equal(c.bitacora.at(-1).tipo, 'precision_sentido');
assert.throws(() => precisarSentido(c, ''), /sentido/i);
assert.deepEqual(definicionesDisponibles({ DEFC: { hexis: [{ id: 'def-hexis', titulo: 'Disposición' }] } }, 'hexis'),
  [{ id: 'def-hexis', concepto: 'hexis', titulo: 'Disposición', fuente: 'definicion_editorial' }]);
assert.deepEqual(definicionesDisponibles({}, 'hexis'), []);
console.log('OK: V2 distingue definición, cualidad, comparación múltiple, evaluación y sentido libre.');
