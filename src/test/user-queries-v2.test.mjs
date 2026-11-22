import assert from 'node:assert/strict';
import { validarQuery } from '../services/user-queries.contract.js';

const payload = {
  textoInicial: '¿Cuáles son las diferencias entre disposición, virtud y felicidad?',
  estado: 'conforme',
  consulta: { tema: 'hexis', intencion: 'distinguir', destino: null,
    conceptosRelacionados: ['arete', 'eudaimonia'], nivel: 'principiante',
    extension: 'breve', origen: 'tema' },
  bitacora: [{ tipo: 'inicio' }, { tipo: 'respuesta' }, { tipo: 'cierre', estado: 'conforme' }],
};
const validado = validarQuery(payload);
assert.deepEqual(validado.consulta.conceptosRelacionados, ['arete', 'eudaimonia']);
assert.equal(validado.consulta.destino, null, 'No convertir varios conceptos en un falso destino único');
assert.deepEqual(validarQuery({ ...payload, consulta: { ...payload.consulta,
  conceptosRelacionados: ['arete', 'arete', 'eudaimonia'] } }).consulta.conceptosRelacionados,
['arete', 'eudaimonia'], 'Eliminar duplicados al guardar');
assert.throws(() => validarQuery({ ...payload, consulta: { ...payload.consulta,
  conceptosRelacionados: ['arete', 4] } }), /Conceptos relacionados inválidos/);
console.log('OK: persistencia V2 de conceptos relacionados sin inventar un nodo de destino.');
