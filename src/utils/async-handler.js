// Express 4 no captura errores de funciones async: los pasa a next().
export const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
