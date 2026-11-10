import { ping } from '../utils/db.js';

export async function health(_req, res) {
  let db = false;
  try { db = await ping(); } catch (_) { db = false; }
  res.status(db ? 200 : 503).json({ ok: db, db });
}
