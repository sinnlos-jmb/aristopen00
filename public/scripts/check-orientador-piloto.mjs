import assert from 'node:assert/strict';
import { iniciarOrientacion, responderOrientacion, responderLibre, siguientePregunta, cerrarOrientacion,
  registrarEvaluacionPiloto } from '../js/lab/orientador.js';
import { diagnosticarContinuidad, validarEvaluacionPiloto, resumirPiloto } from '../shared/orientador-piloto.js';

const ejemplo = iniciarOrientacion('¿Cuáles son las diferencias entre disposición, virtud y felicidad?');
const primera = responderOrientacion(ejemplo, 'arete');
const segunda = responderOrientacion(primera, 'relacionar');
assert.equal(siguientePregunta(segunda).clave, 'nivel', 'No debe volver a preguntar por los conceptos');
assert.deepEqual(segunda.consulta.conceptosRelacionados, ['hexis', 'eudaimonia']);
const transicion = diagnosticarContinuidad(segunda);
assert.equal(transicion.operacionInicial, 'distinguir');
assert.equal(transicion.operacionElegida, 'relacionar');
assert.equal(transicion.cambio, 'distinta');
assert.equal(transicion.distincionPendiente, true, 'Relacionar no equivale a distinguir');
assert.deepEqual(transicion.conceptosNoRetomados, []);

let completo = responderOrientacion(segunda, 'intermedio');
completo = responderOrientacion(completo, 'extensa');
assert.deepEqual(siguientePregunta(completo).opciones.map(o => o.valor),
  ['tema', 'sin_preferencia', 'phusis'], 'No priorizar phýsis por defecto');
completo = responderOrientacion(completo, 'phusis');
const cerrado = cerrarOrientacion(completo, 'conforme');
assert.equal(cerrado.trazabilidadIntencion.origenPedagogico, 'phusis');
assert.equal(cerrado.bitacora.at(-1).tipo, 'cierre');
assert.throws(() => registrarEvaluacionPiloto(completo, { version: 1 }), /cerrada/);
const respuestas = { version: 1, claridad: 'si', fidelidad: 'en_parte', influencia: 'cambio_direccion',
  comentario: 'La distinción inicial parecía diluirse.' };
const evaluada = registrarEvaluacionPiloto(cerrado, respuestas);
assert.deepEqual(evaluada.evaluacionPiloto, respuestas);
assert.equal(cerrado.evaluacionPiloto, null, 'No mutar la sesión anterior');
assert.equal(evaluada.bitacora.at(-1).tipo, 'cierre', 'La bitácora conserva su cierre final');
assert.throws(() => validarEvaluacionPiloto({ ...respuestas, influencia: 'inventada' }), /inválida/);
assert.throws(() => validarEvaluacionPiloto({ ...respuestas, comentario: 'x'.repeat(401) }), /extenso/);
assert.equal(validarEvaluacionPiloto(null), null, 'El feedback es optativo');

let naturaleza = iniciarOrientacion('¿Qué es la naturaleza?');
naturaleza = responderOrientacion(naturaleza, 'distinguir');
naturaleza = responderLibre(naturaleza, 'techne', { FN: { techne: { label: 'Arte' } } }, 'techne');
const cambio = diagnosticarContinuidad(naturaleza);
assert.equal(cambio.operacionInicial, 'definir');
assert.equal(cambio.operacionElegida, 'distinguir');
assert.equal(cambio.cambio, 'distinta');
assert.deepEqual(cambio.conceptosFinales, ['phusis', 'techne']);
const agregado = resumirPiloto([evaluada, cerrado]);
assert.equal(agregado.sesionesV2, 2);
assert.equal(agregado.evaluacionesCompletadas, 1);
assert.equal(agregado.cambiosOperacion.distinta, 2);
assert.equal(agregado.influenciaPercibida.cambio_direccion, 1);
console.log('OK: trazabilidad de intención, evaluación piloto optativa e inmutable, origen neutral.');
