// Protege las rutas que modifican contenido: Authorization: Bearer <EDITOR_TOKEN>.
// Sin EDITOR_TOKEN configurado, solo se permite en desarrollo.
import { timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from '../utils/http-error.js';

const same = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function requireEditor(req, _res, next) {
  if (!config.editorToken) {
    if (config.env === 'development' || config.env === 'test') return next();
    return next(new HttpError(503, 'Edición deshabilitada: falta configurar EDITOR_TOKEN.'));
  }
  const token = /^Bearer (.+)$/.exec(req.get('authorization') || '')?.[1] || '';
  if (!same(token, config.editorToken)) return next(new HttpError(401, 'Token de editor inválido o ausente.'));
  return next();
}
