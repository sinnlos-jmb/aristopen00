// js/content/drafts.js
// Borradores de trayecto del editor del Lab. Hoy viven en sessionStorage
// (clave agora.lab.trayectos); cuando exista la API, solo cambia este módulo.

const KEY = 'agora.lab.trayectos';

export function readDraftTrayectos() {
  try {
    const raw = globalThis.sessionStorage?.getItem(KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all && typeof all === 'object' ? all : {};
  } catch (_) {
    return {};
  }
}

export function activeDraftOf(faqId) {
  const list = readDraftTrayectos()[faqId];
  return Array.isArray(list) ? list.find(t => t?.activo === true) || null : null;
}
