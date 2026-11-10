// Resuelve definición por etapas para cualquier FAQ/concepto.
// Consumido por bot.js → formatDefinitionMessage().

export function getDefinition(S, conceptId) {
  if (!conceptId) return null;
  const defs = S.DEFC?.[conceptId];
  if (!defs?.length) return null;
  const def = defs[0];
  const etapas = def.etapas || [];
  return {
    id: def.id,
    titulo: def.titulo || 'Definición',
    concepto: conceptId,
    referencia: def.referencia || {},
    lectura: def.lectura || null,
    etapasIntro: etapas.filter(e => e.nivel === 'intro'),
    etapasAvanzadas: etapas.filter(e => e.nivel === 'avanzado'),
    etapa1: etapas.find(e => e.nivel === 'intro') || null,
  };
}

export function formatDefinitionMessage(def) {
  const total = def.etapasIntro.length + def.etapasAvanzadas.length;
  return {
    role: 'bot',
    kind: 'definition',
    text: def.referencia.t || '',
    meta: {
      titulo: def.titulo,
      ref: def.referencia.ref || '',
      nota: def.referencia.nota || '',
    },
    etapas: total > 0 ? {
      intro: def.etapasIntro,
      avanzadas: def.etapasAvanzadas,
    } : null,
    options: [
      { id: 'profundizar', kind: 'profundizar', label: 'Ver cómo se construye paso a paso' },
      { id: 'cerrar',      kind: 'cerrar',      label: 'Con eso alcanza, gracias' },
    ],
  };
}

export function conceptOfFaq(S, faq) {
  if (faq?.definicion && S.DEF[faq.definicion]) {
    return S.DEF[faq.definicion].concepto || null;
  }
  if (faq?.arbol?.nodo && S.DEFC?.[faq.arbol.nodo]?.length) {
    return faq.arbol.nodo;
  }
  return null;
}