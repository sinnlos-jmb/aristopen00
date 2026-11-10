// Función pura compartida por las tres interfaces de Ágora.
// Codifica contenido de texto o atributos entrecomillados en HTML.
const ENTITIES = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
});

export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ENTITIES[char]);
