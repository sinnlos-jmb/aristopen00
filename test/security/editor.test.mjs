import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRequireEditor } from '../../src/middleware/require-editor.js';

function autorizar(tokenConfigurado, cabecera = '') {
  let resultado;
  const req = { get: name => name === 'authorization' ? cabecera : '' };
  crearRequireEditor(tokenConfigurado)(req, {}, error => { resultado = error || null; });
  return resultado;
}

test('sin EDITOR_TOKEN, todas las escrituras quedan deshabilitadas (también en desarrollo)', () => {
  assert.equal(autorizar('', 'Bearer cualquier-token')?.status, 503);
  assert.equal(autorizar('')?.status, 503);
});

test('con token configurado, credenciales ausentes o inválidas devuelven 401', () => {
  assert.equal(autorizar('clave-temporal')?.status, 401);
  assert.equal(autorizar('clave-temporal', 'Bearer incorrecta')?.status, 401);
  assert.equal(autorizar('clave-temporal', 'Basic clave-temporal')?.status, 401);
});

test('con token correcto se permite continuar', () => {
  assert.equal(autorizar('clave-temporal', 'Bearer clave-temporal'), null);
});
