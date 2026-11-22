import assert from 'node:assert/strict';
import { validarQuery } from '../services/user-queries.contract.js';

const payload = {
  textoInicial: '¿Cuáles son las diferencias entre disposición, virtud y felicidad?',
  estado: 'conforme',
  consulta: { tema: 'arete', intencion: 'relacionar', destino: null,
    conceptosRelacionados: ['hexis', 'eudaimonia'], nivel: 'intermedio', extension: 'extensa', origen: 'phusis' },
  interpretacion: { version: 2, operacion: 'distinguir', precision: 'diferencia',
    forma: 'comparacion_multiple', conceptos: ['hexis', 'arete', 'eudaimonia'] },
  evaluacionPiloto: { version: 1, claridad: 'si', fidelidad: 'en_parte', influencia: 'cambio_direccion',
    comentario: 'Preferiría distinguir en lugar de relacionar.' },
  bitacora: [{ tipo: 'inicio' }, { tipo: 'respuesta' }, { tipo: 'cierre', estado: 'conforme' }],
};
const value = validarQuery(payload);
assert.deepEqual(value.evaluacionPiloto, payload.evaluacionPiloto);
assert.equal(value.trazabilidadIntencion.cambio, 'distinta');
assert.equal(value.trazabilidadIntencion.distincionPendiente, true);
assert.deepEqual(value.trazabilidadIntencion.conceptosNoRetomados, []);
assert.equal(validarQuery({ ...payload, evaluacionPiloto: null }).evaluacionPiloto, null);
assert.equal(validarQuery({ ...payload, evaluacionPiloto: undefined }).evaluacionPiloto, null);
assert.throws(() => validarQuery({ ...payload, evaluacionPiloto: { ...payload.evaluacionPiloto, fidelidad: 'quizas' } }), /inválida/);
assert.throws(() => validarQuery({ ...payload, evaluacionPiloto: { ...payload.evaluacionPiloto, comentario: 'x'.repeat(401) } }), /inválida/);
assert.equal(value.trazabilidadIntencion.operacionInicial, 'distinguir');
// La trazabilidad se calcula a partir de datos validados, no se acepta del cliente.
assert.equal(validarQuery({ ...payload, trazabilidadIntencion: { cambio: 'conservada' } }).trazabilidadIntencion.cambio, 'distinta');
console.log('OK: validación y trazabilidad del piloto, compatibilidad sin evaluación.');
