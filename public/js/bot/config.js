// js/bot/config.js
// Política de modos del bot. Es fija por sección (no se cambia desde la interfaz).
//
//   dummy → solo reproduce reglas explícitas (trayectos publicados o respuestas
//           directas). Si la FAQ no tiene regla, lo informa. Nunca planifica.
//   smart → si hay trayecto, lo reproduce igual que dummy; si no, el planificador
//           propone un recorrido (marcado como generado).
//
// El modo depende de cómo llegó la consulta: elegida de la lista de FAQ (`faq`)
// o escrita por el usuario (`texto`).

export const MODES = Object.freeze(['dummy', 'smart']);
export const VIAS = Object.freeze(['faq', 'texto']);

export const POLITICAS = Object.freeze({
  dialogo: Object.freeze({ faq: 'dummy', texto: 'smart' }),
  lab: Object.freeze({ faq: 'smart', texto: 'smart' }),
});

// Diálogo usa solo contenido publicado; la previsualización del Lab es explícita.
// Los borradores activos no se eliminan ni se modifican.
export const DIALOGO_CONFIG = Object.freeze({ politica: POLITICAS.dialogo, previewDrafts: false });
export const LAB_CONFIG = Object.freeze({ politica: POLITICAS.lab, previewDrafts: true });

const modeOr = (m, d) => (MODES.includes(m) ? m : d);

// Acepta { politica: { faq, texto } } o el atajo { modo } (mismo modo para todo).
export function normalizeConfig(cfg = {}) {
  const base = cfg.modo ? { faq: cfg.modo, texto: cfg.modo } : (cfg.politica || {});
  return {
    politica: {
      faq: modeOr(base.faq, DIALOGO_CONFIG.politica.faq),
      texto: modeOr(base.texto, DIALOGO_CONFIG.politica.texto),
    },
    previewDrafts: typeof cfg.previewDrafts === 'boolean' ? cfg.previewDrafts : DIALOGO_CONFIG.previewDrafts,
  };
}
