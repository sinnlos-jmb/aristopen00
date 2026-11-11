import { Router } from 'express';
import { asyncHandler as h } from '../utils/async-handler.js';
import { registrarQuery } from '../services/user-queries.service.js';
import { HttpError } from '../utils/http-error.js';

// Protección provisional para la maqueta (por proceso; no sustituye un rate-limit
// compartido para despliegues múltiples). No persiste direcciones en MariaDB.
const entradas = new Map();
function permitir(ip) {
  const ahora = Date.now();
  for (const [key, item] of entradas) if (ahora - item.inicio >= 3600000) entradas.delete(key);
  const actual = entradas.get(ip) || { inicio: ahora, cantidad: 0 };
  if (actual.cantidad >= 10) return false;
  actual.cantidad++;
  entradas.set(ip, actual);
  return true;
}

// Registro voluntario, sin identidad de usuario. No expone un GET público.
export const userQueriesRouter = Router().post('/', h(async (req, res) => {
  if (req.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    throw new HttpError(415, 'Se requiere application/json.');
  }
  const origin = req.get('origin');
  if (origin) {
    let host;
    try { host = new URL(origin).host; } catch { throw new HttpError(403, 'Origen no autorizado.'); }
    if (host !== req.get('host')) throw new HttpError(403, 'Origen no autorizado.');
  }
  if (!permit(req.ip || 'sin-ip')) throw new HttpError(429, 'Demasiadas consultas.');
  let result;
  try { result = await registrarQuery(req.body); }
  catch (err) {
    if (/inválid|Falta|cerrada|cierre/.test(err.message)) throw new HttpError(400, err.message);
    throw err;
  }
  res.set('Cache-Control', 'no-store').status(201).json(result);
}));
