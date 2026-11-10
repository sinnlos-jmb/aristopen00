// public/js/content/repository.js
// Única puerta de acceso al contenido. El bot, el Lab y las vistas leen por acá,
// no de S.tags ni de los archivos. Hoy se alimenta de los JSON; cuando el
// contenido pase a MariaDB, se reemplaza la implementación sin tocar a los consumidores.

import { normalizeTrayecto, validateTrayecto } from './trayecto.js';
import { activeDraftOf } from './drafts.js';

export function createRepository(S, { tags = {}, trayectos = null } = {}) {
  const published = {};
  for (const raw of trayectos?.trayectos || []) {
    if (raw?.estado !== 'publicado') continue;
    const t = normalizeTrayecto(raw, S, { estado: 'publicado' });
    published[t.faq] = t; // un trayecto publicado por FAQ
  }

  const withValidation = t => (t ? { trayecto: t, ...validateTrayecto(t, S) } : null);

  return {
    version: () => tags.version || '—',
    libroTagueado: () => tags.mapa?.libro_tagueado || 'I',

    faqs: () => tags.faqs || [],
    faq: id => S.FAQ?.[id] || null,
    unidades: () => tags.unidades || [],
    unidad: id => S.U?.[id] || null,
    subunidades: () => (tags.unidades || []).flatMap(u => u.subunidades || []),
    subunidad: id => S.SUB?.[id] || null,
    definiciones: () => tags.definiciones || [],
    mapa: () => tags.mapa || null,

    // Trayectos: la regla explícita que responde una FAQ.
    trayectosPublicados: () => Object.values(published),
    trayectoPublicado: faqId => published[faqId] || null,
    esCurada: faqId => !!published[faqId],
    trayectoBorrador: faqId => normalizeTrayecto(activeDraftOf(faqId), S, { estado: 'borrador' }),

    // Trayecto que debe reproducir el chat, ya validado: { trayecto, errores, avisos } o null.
    trayectoVigente(faqId, { previewDrafts = false } = {}) {
      const draft = previewDrafts ? this.trayectoBorrador(faqId) : null;
      return withValidation(draft || published[faqId] || null);
    },

    // ----------------------------------------------------------------------
    // NUEVO: Métricas de progreso del corpus para la portada
    // ----------------------------------------------------------------------
    getStats: () => {
      // 1. Último pasaje procesado (buscamos la subunidad con el mayor ID)
      const subunidades = Object.values(S.SUB || {});
      const ultimaSub = subunidades.reduce((prev, current) => 
        (prev.id > current.id) ? prev : current
      , { titulo: 'Sin procesar', bekker: '—', id: -1 });

      // 2. Conteo de componentes del motor dialógico
      const totalFaqs = Object.keys(S.FAQ || {}).length;
      
      // Dependiendo de cómo el backend mande los conceptos, los leemos de tags
      // (si en el futuro migran a otra key, solo se ajusta acá)
      const totalConceptos = Object.keys(tags.conceptos || {}).length;
      
      // 3. Trayectos curados y publicados
      const totalesPublicados = Object.keys(published).length;

      return {
        ultimoPasaje: ultimaSub.titulo,
        ultimoBekker: ultimaSub.bekker,
        totalFaqs,
        totalConceptos,
        trayectosPublicados: totalesPublicados
      };
    }
  };
}