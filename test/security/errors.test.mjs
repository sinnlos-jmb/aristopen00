import test from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { HttpError } from '../../src/utils/http-error.js';

function responder(error) {
  const respuesta = { statusCode: 200, body: null,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
  const req = { method: 'POST', originalUrl: '/api/faqs' };
  errorHandler(error, req, respuesta, () => {});
  return { status: respuesta.statusCode, body: respuesta.body };
}

test('error SQL conocido: devuelve mensaje público sin sqlMessage ni SQL privado', () => {
  for (const [code, status] of [
    ['ER_DUP_ENTRY', 409], ['ER_NO_REFERENCED_ROW_2', 422], ['ER_ROW_IS_REFERENCED_2', 409],
  ]) {
    const r = responder({ code, sqlMessage: 'INSERT INTO secretos VALUES (password=' + 'abc' + ')' });
    assert.equal(r.status, status);
    assert.ok(r.body.error);
    assert.ok(!('detalles' in r.body));
    assert.doesNotMatch(JSON.stringify(r.body), /secretos|password|INSERT/i);
  }
});

test('errores de validación conservan sus detalles públicos explícitos', () => {
  assert.deepEqual(responder(new HttpError(422, 'Datos inválidos', ['Falta un campo'])), {
    status: 422, body: { error: 'Datos inválidos', detalles: ['Falta un campo'] },
  });
});
