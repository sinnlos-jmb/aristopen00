import { toRow, fromRow, insertRow } from '../utils/record.js';

const ARGUMENTO = { tipo: 'text', descripcion: 'text', secuencia: 'json', hit_obligatorios: 'json' };

export async function listArgumentos(db) {
  const rows = await db.query('SELECT * FROM argumentos ORDER BY orden');
  return Object.fromEntries(rows.map(r => [r.id, fromRow(r, ARGUMENTO)]));
}

export async function insertArgumentos(db, argumentos = {}) {
  let orden = 0;
  for (const [id, arg] of Object.entries(argumentos)) {
    await insertRow(db, 'argumentos', { ...toRow(arg, ARGUMENTO), id, orden: orden++ });
  }
}

export async function exists(db, id) {
  const [row] = await db.query('SELECT 1 AS ok FROM argumentos WHERE id = ?', [id]);
  return !!row;
}

export async function deleteAll(db) {
  await db.query('DELETE FROM argumentos');
}
