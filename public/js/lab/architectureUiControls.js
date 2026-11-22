// N1-U.8 · Ajustes de interacción, sin cambios editoriales ni persistencia.
export const ZOOM_SENSITIVITY_ANTERIOR = 0.16;
export const ZOOM_SENSITIVITY_TRIPLE = ZOOM_SENSITIVITY_ANTERIOR * 3;
export const ZOOM_SENSITIVITY_ACTUAL = 0.60; // N1-U.9 · solicitado para rueda/trackpad.
const escapar = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export function opcionesModalFichasHtml(fichas) {
  if (!Array.isArray(fichas)) throw new TypeError('Se esperaba una colección de fichas');
  return fichas.map(ficha => {
    const estado = ficha.tipo === 'faq'
      ? (ficha.fuente_editorial?.origen === 'propuesta_lab' ? 'FAQ de síntesis · borrador' : 'FAQ con trayecto editorial')
      : 'Proemio · marco argumentativo';
    return `<button type="button" class="arch-picker-option" data-arch-card="${escapar(ficha.id)}" aria-pressed="false">`
      + `<span class="arch-picker-option-title">${escapar(ficha.titulo)}</span><small>${escapar(estado)}</small></button>`;
  }).join('');
}
