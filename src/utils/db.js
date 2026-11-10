// Conexión a MariaDB (paquete `mariadb`). Un pool por proceso.
// Los repositorios reciben `db` (el pool o una conexión de transacción): ambos tienen .query().
import mariadb from 'mariadb';
import { config } from '../config.js';

let pool = null;

export function createPool(overrides = {}) {
  return mariadb.createPool({
    ...config.db,
    ...overrides,
    charset: 'utf8mb4',
    // Las columnas JSON se (de)serializan explícitamente en utils/record.js.
    autoJsonMap: false,
    bigIntAsNumber: true,
    insertIdAsNumber: true,
    decimalAsNumber: true,
  });
}

export function getPool() {
  if (!pool) pool = createPool();
  return pool;
}

export function setPool(p) {
  pool = p;
}

export async function closePool() {
  if (pool) await pool.end();
  pool = null;
}

// Ejecuta fn(conn) dentro de una transacción; hace rollback si fn lanza.
export async function withTransaction(fn, db = getPool()) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

export async function ping(db = getPool()) {
  const [row] = await db.query('SELECT 1 AS ok');
  return row?.ok === 1;
}
