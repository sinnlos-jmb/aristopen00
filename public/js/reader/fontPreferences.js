// N1-U.14 · Preferencia compartida con el lector del Lab N1-U.12.
// Mantiene graphFont y showEdgeNames; jamás modifica los datos editoriales.
export const READER_PREFS_KEY = 'agora.lab.arquitectura.lectura.v1';
export const MIN_READER_FONT = 14;
export const MAX_READER_FONT = 30;
export const DEFAULT_READER_FONT = 18;
export function normalizarTamanoLector(value) {
  return Number.isInteger(value) && value >= MIN_READER_FONT && value <= MAX_READER_FONT
    ? value : DEFAULT_READER_FONT;
}
export function obtenerTamanoLector(storage = undefined) {
  try { return normalizarTamanoLector(JSON.parse((storage ?? globalThis.localStorage)?.getItem(READER_PREFS_KEY) || '{}').readerFont); }
  catch { return DEFAULT_READER_FONT; }
}
export function guardarTamanoLector(size, storage = undefined) {
  const value = normalizarTamanoLector(size);
  try {
    storage = storage ?? globalThis.localStorage;
    const previous = JSON.parse(storage?.getItem(READER_PREFS_KEY) || '{}');
    const safe = previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {};
    storage?.setItem(READER_PREFS_KEY, JSON.stringify({ ...safe, readerFont: value }));
  } catch { /* Lectura sigue disponible sin almacenamiento. */ }
  if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('agora:reader-font-change', { detail: { value } }));
  return value;
}
export function controlesTamanoLector() {
  return `<div class="agora-reader-tools" role="group" aria-label="Tamaño del texto bilingüe">
    <span>Texto</span>
    <button type="button" data-reader-font-step="-2" aria-label="Disminuir tamaño del texto">A−</button>
    <output data-reader-font-value aria-live="polite">${obtenerTamanoLector()} px</output>
    <button type="button" data-reader-font-step="2" aria-label="Aumentar tamaño del texto">A+</button>
  </div>`;
}
export function actualizarLectura(root, value = obtenerTamanoLector()) {
  if (!root) return;
  root.style?.setProperty('--agora-reader-font-size', `${value}px`);
  root.querySelectorAll?.('[data-reader-font-value]').forEach(out => { out.textContent = `${value} px`; });
  root.querySelectorAll?.('[data-reader-font-step]').forEach(button => {
    button.disabled = Number(button.dataset.readerFontStep) < 0 ? value <= MIN_READER_FONT : value >= MAX_READER_FONT;
  });
}
export function cambiarTamanoLector(root, delta) {
  const next = Math.min(MAX_READER_FONT, Math.max(MIN_READER_FONT, obtenerTamanoLector() + delta));
  guardarTamanoLector(next);
  actualizarLectura(root, next);
  return next;
}
