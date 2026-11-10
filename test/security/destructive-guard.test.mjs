import test from 'node:test';
import assert from 'node:assert/strict';
import { assertIsolatedTestDb } from '../helpers/destructive-guard.mjs';

const base = {
  database: 'agora_test', declaredDatabase: 'agora_test', host: '127.0.0.1',
  confirmation: 'YES_DELETE_TEST_DB',
};

test('la suite destructiva requiere confirmación explícita', () => {
  assert.throws(() => assertIsolatedTestDb({ ...base, confirmation: undefined }), /bloqueada/);
  assert.throws(() => assertIsolatedTestDb({ ...base, confirmation: '1' }), /bloqueada/);
});

test('rechaza aristotle, nombres no aislados o discrepancia de esquema', () => {
  for (const database of ['aristotle', 'agora', 'production', 'aristotle_test_prod']) {
    assert.throws(() => assertIsolatedTestDb({ ...base, database, declaredDatabase: database }), /bloqueada/);
  }
  assert.throws(() => assertIsolatedTestDb({ ...base, declaredDatabase: 'otra_test' }), /bloqueada/);
});

test('rechaza servidores remotos aunque se use un esquema *_test', () => {
  assert.throws(() => assertIsolatedTestDb({ ...base, host: '203.0.113.10' }), /bloqueada/);
});

test('admite un esquema temporal declarado explícitamente en un servidor local', () => {
  assert.doesNotThrow(() => assertIsolatedTestDb(base));
  assert.doesNotThrow(() => assertIsolatedTestDb({ ...base, database: 'test_migraciones', declaredDatabase: 'test_migraciones', host: 'localhost' }));
});
