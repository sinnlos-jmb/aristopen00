import { HttpError } from '../utils/http-error.js';

// Errores de MariaDB que corresponden a problemas del pedido, no del servidor.
const DB_ERRORS = {
  ER_DUP_ENTRY: [409, 'Ya existe un registro con esa clave.'],
  ER_NO_REFERENCED_ROW_2: [422, 'Referencia a un registro inexistente.'],
  ER_ROW_IS_REFERENCED_2: [409, 'El registro está en uso por otros datos.'],
};

export function notFoundApi(req, _res, next) {
  next(new HttpError(404, `Ruta inexistente: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details !== undefined && { detalles: err.details }) });
  }
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido en el cuerpo del pedido.' });
  const mapped = DB_ERRORS[err?.code];
  if (mapped) return res.status(mapped[0]).json({ error: mapped[1], detalles: err.sqlMessage });
  if (err?.code === 'ECONNREFUSED' || err?.code === 'ER_GET_CONNECTION_TIMEOUT' || err?.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(503).json({ error: 'Base de datos no disponible.' });
  }
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  return res.status(500).json({ error: 'Error interno.' });
}
