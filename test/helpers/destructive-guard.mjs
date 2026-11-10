// Guardia obligatoria ANTES de ejecutar DROP TABLE de los tests históricos.
// No reemplaza el aislamiento real: usá una instancia local descartable.
export function assertIsolatedTestDb({ database, declaredDatabase, host, confirmation }) {
  if (confirmation !== 'YES_DELETE_TEST_DB') {
    throw new Error('Suite destructiva bloqueada: falta ALLOW_DESTRUCTIVE_DB_TESTS=YES_DELETE_TEST_DB.');
  }
  if (!database || database !== declaredDatabase ||
      !/^(?:test_[a-z0-9_]+|[a-z0-9_]+_test)$/.test(database)) {
    throw new Error('Suite destructiva bloqueada: TEST_DB_NAME debe ser explícito y llamarse test_* o *_test.');
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error('Suite destructiva bloqueada: DB_HOST debe ser local. Nunca apuntar a MariaDB remota.');
  }
}
