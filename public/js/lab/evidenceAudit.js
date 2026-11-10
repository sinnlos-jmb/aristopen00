// Diagnóstico de solo lectura. No modifica las selecciones del bot.
// Distingue evidencia propia de la subunidad de tags del párrafo (contexto de unidad).

function cleanId(id) {
  return String(id ?? '').split('#')[0];
}

function matchTagsInUnit(S, unidad, conceptIds) {
  const out = [];
  for (const numero of unidad?.parrafos || []) {
    const parrafo = S.TP?.[numero];
    if (!parrafo) continue;
    const tags = (parrafo.conceptos || [])
      .filter(tag => conceptIds.includes(cleanId(tag.c)))
      .map(tag => ({
        concepto: tag.c,
        sentido: tag.s || null,
        nivel: tag.n || null,
        implicito: tag.implicito === true,
        via: tag.via || null,
        recurso: tag.recurso || null,
      }));
    if (tags.length) out.push({ parrafo: numero, tags });
  }
  return out;
}

// Devuelve evidencia *disponible*, no un juicio sobre corrección filosófica.
// Si el bot no llegó a elegir un recorrido, los candidatos provienen SOLO del índice
// de conceptos_clave y no se presentan como decisiones efectivas del planificador.
export function buildEvidenceAudit(S, simulation, { limit = 12 } = {}) {
  const detectedIds = [...new Set((simulation?.diagnosis?.analysis?.conceptos || [])
    .map(c => cleanId(c.id)).filter(Boolean))];
  const planIds = (simulation?.plan || []).map(s => s.id).filter(id => !!S.SUB?.[id]);
  const hasPlan = planIds.length > 0;
  const entries = hasPlan
    ? planIds.map(id => [id, S.SUB[id]])
    : Object.entries(S.SUB || {}).filter(([, sub]) =>
        (sub.conceptos_clave || []).some(c => detectedIds.includes(cleanId(c))));
  const candidates = [];
  const seen = new Set();
  for (const [id, sub] of entries) {
    if (seen.has(id)) continue;
    seen.add(id);
    const unidad = S.U?.[sub.unidad] || null;
    const momento = S.MOM?.[id]?.m || null;
    const matchedIds = (sub.conceptos_clave || [])
      .map(cleanId).filter(c => detectedIds.includes(c));
    const contextoUnidad = matchTagsInUnit(S, unidad, detectedIds);
    candidates.push({
      id,
      titulo: sub.titulo || id,
      unidad: { id: sub.unidad || null, titulo: unidad?.titulo || sub.unidad || null },
      momento: momento ? { id: momento.id || null, titulo: momento.titulo || null } : null,
      conceptosClave: (sub.conceptos_clave || []).map(cleanId),
      conceptosCoincidentes: [...new Set(matchedIds)],
      movimientos: sub.movimientos || [],
      vocesTexto: sub.voz_texto || [],
      relacionesRegistradas: (sub.relaciones || []).length,
      contextoUnidad,
      // La ausencia de tags aquí no significa ausencia del concepto en el pasaje.
      // El archivo disponible etiqueta párrafos, no rangos Bekker de subunidades.
      vinculoTagSubunidad: 'no_acreditado',
      fundamentoCandidato: hasPlan ? 'paso_del_plan' : 'conceptos_clave',
    });
  }
  return {
    version: 1,
    detectados: detectedIds,
    tipo: hasPlan ? 'plan_real' : 'candidatos_por_indice',
    planConfirmado: hasPlan,
    total: candidates.length,
    mostrados: candidates.slice(0, limit),
    nota: hasPlan
      ? 'Los pasos figuran en el plan del bot. Los tags de párrafo son contexto de unidad, no prueba atribuible a la subunidad.'
      : 'Sin plan confirmado: se muestran subunidades con conceptos_clave coincidentes. No es una selección ni un ranking del bot. Los tags corresponden a párrafos de la unidad.',
  };
}
