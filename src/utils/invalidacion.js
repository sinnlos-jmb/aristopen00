// Notificación local: no sustituye la expiración para cambios desde otros procesos.
const listeners = new Set();
export function alInvalidarContenido(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function avisarInvalidacionContenido() { for (const fn of listeners) fn(); }
