import { Router } from 'express';
import { asyncHandler as h } from '../utils/async-handler.js';
import { registrarQuery } from '../services/user-queries.service.js';
import { HttpError } from '../utils/http-error.js';


// Protección provisional para la maqueta (por proceso; no sustituye un rate-limit
// compartido para despliegues múltiples). No persiste direcciones en MariaDB.
// Límite provisional: 10 registros por IP y por hora.
// Se reinicia al reiniciar el servidor.
const entradas = new Map();

function permit(ip) {
  const ahora = Date.now();
  const ventana = 60 * 60 * 1000;
  const clave = ip || 'sin-ip';

  for (const [key, registro] of entradas) {
    if (ahora - registro.inicio >= ventana) {
      entradas.delete(key);
    }
  }

  const registro = entradas.get(clave);

  if (!registro) {
    entradas.set(clave, { inicio: ahora, cantidad: 1 });
    return true;
  }

  if (registro.cantidad >= 10) {
    return false;
  }

  registro.cantidad++;
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
