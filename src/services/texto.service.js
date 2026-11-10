import crypto from 'node:crypto';
import { getPool } from '../utils/db.js';
import { parseJson } from '../utils/record.js';
import { HttpError } from '../utils/http-error.js';

export const CLAVE_TEXTO = 'texto.EN_libro1_v8';
export const sha256 = texto => crypto.createHash('sha256').update(texto, 'utf8').digest('hex');

export async function leerTexto(db = getPool(), { bloquear = false } = {}) {
  const rows = await db.query(`SELECT contenido FROM documentos WHERE clave = ?${bloquear ? ' FOR UPDATE' : ''}`, [CLAVE_TEXTO]);
  if (!rows.length) return null;
  const texto = parseJson(rows[0].contenido);
  if (typeof texto !== 'string' || !texto.trim()) throw new Error('El documento de texto en la base es inválido.');
  return texto;
}

// Sólo inserta si falta; si hay contenido diferente, se detiene. El llamador abre la transacción.
export async function insertarTextoSiFalta(conn, texto) {
  if (typeof texto !== 'string' || !texto.trim()) throw new Error('El texto de entrada está vacío o es inválido.');
  const previo = await leerTexto(conn, { bloquear: true });
  if (previo !== null) {
    if (previo !== texto) throw new Error('El texto de la base difiere del archivo; no se sobrescribió.');
    return 'ya-existia';
  }
  await conn.query('INSERT INTO documentos (clave, contenido) VALUES (?, ?)', [CLAVE_TEXTO, JSON.stringify(texto)]);
  const guardado = await leerTexto(conn);
  if (guardado !== texto) throw new Error('Falló la verificación exacta del texto guardado.');
  return 'insertado';
}

export async function textoLibro(_req, res) {
  const texto = await leerTexto();
  if (texto === null) throw new HttpError(503, 'El texto todavía no está cargado en la base de datos.');
  res.set('Cache-Control', 'no-store').set('X-Texto-SHA256', sha256(texto)).type('text/plain; charset=utf-8').send(texto);
}
