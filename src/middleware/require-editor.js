// Todas las rutas editoriales requieren EDITOR_TOKEN, incluso en desarrollo.
// Sin token configurado, la edición queda deshabilitada (fail-closed).
import { timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from '../utils/http-error.js';

const same = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// Factoría pura para probar la política sin levantar una API ni tocar MariaDB.
export const crearRequireEditor = (editorToken = config.editorToken) => (req, _res, next) => {
  if (!editorToken) return next(new HttpError(503, 'Edición deshabilitada.'));
  const token = /^Bearer (.+)$/.exec(req.get('authorization') || '')?.[1] || '';
  if (!same(token, editorToken)) return next(new HttpError(401, 'Token de editor inválido o ausente.'));
  return next();
};

export const requireEditor = crearRequireEditor();
