// Trayectos (versiones editoriales por FAQ), sus pasos y el vínculo paso ↔ subunidad.
import { toRow, fromRow, insertRow, updateRow } from '../utils/record.js';

const TRAYECTO = { id: 'text', estado: 'text', version: 'int', titulo: 'text', origen: 'text' };
const PASO = { titulo: 'text', bekker: 'json', transicion_entrante: 'text', exposicion: 'text',
  ejemplo: 'text', cita: 'text', notas_laterales: 'json' };

async function pasosOf(db, ids) {
  if (!ids.length) return new Map();
  const marks = ids.map(() => '?').join(',');
  const pasos = await db.query(`SELECT * FROM trayecto_pasos WHERE trayecto_id IN (${marks}) ORDER BY trayecto_id, orden`, ids);
  const links = pasos.length
    ? await db.query(`SELECT * FROM paso_subunidades WHERE paso_id IN (${pasos.map(() => '?').join(',')}) ORDER BY paso_id, orden`, pasos.map(p => p.id))
    : [];
  const subsByPaso = links.reduce((m, l) => m.set(l.paso_id, [...(m.get(l.paso_id) || []), l.subunidad_id]), new Map());
  const out = new Map();
  for (const p of pasos) {
    const paso = { id: p.clave, subunidades: subsByPaso.get(p.id) || [], ...fromRow(p, PASO) };
    out.set(p.trayecto_id, [...(out.get(p.trayecto_id) || []), paso]);
  }
  return out;
}

const META = r => ({ creado: r.creado, actualizado: r.actualizado, publicado_en: r.publicado_en });

function assemble(row, pasos, { meta = false } = {}) {
  const t = fromRow(row, TRAYECTO);
  const out = { id: t.id, faq: row.faq_id, ...t, pasos: pasos.get(row.id) || [] };
  return meta ? { ...out, ...META(row) } : out;
}

export async function listTrayectos(db, { faqId = null, estado = null, meta = false } = {}) {
  const where = [];
  const params = [];
  if (faqId) { where.push('faq_id = ?'); params.push(faqId); }
  if (estado) { where.push('estado = ?'); params.push(estado); }
  const rows = await db.query(
    `SELECT t.* FROM trayectos t JOIN faqs f ON f.id = t.faq_id
     ${where.length ? `WHERE ${where.map(w => `t.${w}`).join(' AND ')}` : ''}
     ORDER BY f.orden, t.version`, params);
  const pasos = await pasosOf(db, rows.map(r => r.id));
  return rows.map(r => assemble(r, pasos, { meta }));
}

export async function getTrayecto(db, id, { forUpdate = false } = {}) {
  const [row] = await db.query(`SELECT * FROM trayectos WHERE id = ?${forUpdate ? ' FOR UPDATE' : ''}`, [id]);
  if (!row) return null;
  return assemble(row, await pasosOf(db, [id]), { meta: true });
}

export async function nextVersion(db, faqId) {
  const [row] = await db.query('SELECT COALESCE(MAX(version), 0) + 1 AS n FROM trayectos WHERE faq_id = ?', [faqId]);
  return row.n;
}

export async function insertTrayecto(db, t) {
  const row = { ...toRow(t, TRAYECTO, { skip: ['faq', 'pasos'] }), faq_id: t.faq };
  await insertRow(db, 'trayectos', row);
  await replacePasos(db, t.id, t.pasos);
}

export async function updateTrayecto(db, t) {
  const row = toRow(t, TRAYECTO, { skip: ['id', 'faq', 'pasos', 'estado', 'version'] });
  await updateRow(db, 'trayectos', 'id', t.id, row);
  await replacePasos(db, t.id, t.pasos);
}

export async function replacePasos(db, trayectoId, pasos = []) {
  await db.query('DELETE FROM trayecto_pasos WHERE trayecto_id = ?', [trayectoId]); // en cascada: paso_subunidades
  let orden = 0;
  for (const paso of pasos) {
    const r = await insertRow(db, 'trayecto_pasos', {
      ...toRow(paso, PASO, { skip: ['id', 'subunidades'] }), trayecto_id: trayectoId, orden: orden++, clave: paso.id,
    });
    let i = 0;
    for (const sid of paso.subunidades || []) {
      await insertRow(db, 'paso_subunidades', { paso_id: r.insertId, orden: i++, subunidad_id: sid });
    }
  }
}

// Archiva el publicado vigente de la FAQ (si hay) y publica este trayecto.
export async function publish(db, id, faqId) {
  await db.query("UPDATE trayectos SET estado = 'archivado' WHERE faq_id = ? AND estado = 'publicado' AND id <> ?", [faqId, id]);
  await db.query("UPDATE trayectos SET estado = 'publicado', publicado_en = CURRENT_TIMESTAMP WHERE id = ?", [id]);
}

export async function deleteTrayecto(db, id) {
  const r = await db.query('DELETE FROM trayectos WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

export async function deleteAll(db) {
  await db.query('DELETE FROM trayectos'); // en cascada: pasos y vínculos
}
