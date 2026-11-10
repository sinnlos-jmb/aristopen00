// Documentos JSON completos (lo que todavía no tiene tablas propias).
import { parseJson } from '../utils/record.js';

export async function getDocumentos(db, prefix = '') {
  const rows = await db.query('SELECT clave, contenido FROM documentos WHERE clave LIKE ? ORDER BY clave', [`${prefix}%`]);
  return Object.fromEntries(rows.map(r => [r.clave, parseJson(r.contenido)]));
}

export async function putDocumento(db, clave, contenido) {
  await db.query(
    'INSERT INTO documentos (clave, contenido) VALUES (?, ?) ON DUPLICATE KEY UPDATE contenido = VALUES(contenido)',
    [clave, JSON.stringify(contenido)]);
}

export async function deleteAll(db) {
  // Sólo documentos administrados por replaceAll: conserva texto y otros documentos independientes.
  await db.query("DELETE FROM documentos WHERE clave LIKE 'tags.%' OR clave IN ('funcional', 'manual.meta', 'argumentos.meta', 'trayectos.meta', 'orden.claves')");
}
