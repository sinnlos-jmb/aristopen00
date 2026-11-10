// Composer v2: combina cuatro capas para armar cada paso del diálogo:
// 1. Transición (manual.por_arista o relación/destino entre la sub-unidad previa y la actual)
// 2. Exposición principal (manual.por_subunidad[subId].exposicion → apertura en paso 1 → sub.intro)
// 3. Ejemplo pedagógico o cita textual (manual.por_subunidad[subId].ejemplo / .cita)
// 4. Notas laterales asociadas al paso o concepto (disponibles para desvío opcional)

function lookupArista(manual, de, a) {
  if (!manual?.por_arista || !de || !a) return null;
  return manual.por_arista[`${de}--${a}`]
      || manual.por_arista[`${a}--${de}`]
      || null;
}

// Busca si en tags_v4.json la sub-unidad previa tiene un destino o arista que conecte con la actual
function lookupTagTransition(S, prevSubId, currentSubId, manual) {
  if (!prevSubId || !currentSubId || !S?.SUB?.[prevSubId]) return null;
  const prevSub = S.SUB[prevSubId];
  for (const rel of prevSub.relaciones || []) {
    for (const d of rel.destinos || []) {
      if (d.arista && manual?.por_arista?.[d.arista]?.transicion) {
        const [c1, c2] = d.arista.split('--');
        const currConcepts = S.SUB[currentSubId]?.conceptos_clave || [];
        if (currConcepts.includes(c1) || currConcepts.includes(c2)) {
          return manual.por_arista[d.arista].transicion;
        }
      }
      if (d.ref && String(d.ref).replace(/[–—]/g, '-').includes(currentSubId) && d.t) {
        return d.t;
      }
    }
  }
  return null;
}

export function getStepLateralNotes(S, manual, subId, conceptId) {
  const m = manual || {};
  const notesMap = m.notas_laterales || {};
  const out = [];
  const seen = new Set();

  const pushNote = (noteId) => {
    if (!noteId || seen.has(noteId) || !notesMap[noteId]) return;
    seen.add(noteId);
    out.push({ id: noteId, ...notesMap[noteId] });
  };

  // 1. Notas laterales vinculadas explícitamente a esta sub-unidad en manual.por_subunidad
  const subEntry = subId ? m.por_subunidad?.[subId] : null;
  for (const nid of subEntry?.notas_laterales || []) pushNote(nid);

  // 2. Notas laterales cuyo campo `subs` incluye esta sub-unidad
  for (const [nid, note] of Object.entries(notesMap)) {
    if (Array.isArray(note.subs) && note.subs.includes(subId)) pushNote(nid);
  }

  // 3. Notas laterales vinculadas al concepto en manual.por_concepto
  const conceptEntry = conceptId ? m.por_concepto?.[conceptId] : null;
  for (const nid of conceptEntry?.notas_laterales || []) pushNote(nid);

  return out;
}

export function composeStep(S, manual, conceptId, prevId, subUnit, opts = {}) {
  const m = manual || { por_concepto: {}, por_arista: {}, por_subunidad: {} };
  const subId = subUnit?.id || null;
  const prevSubId = opts.prevSubId || null;
  const isFirst = !prevId && !prevSubId;

  const concepto = conceptId ? m.por_concepto?.[conceptId] : null;
  // La exposición de un paso fusionado vive en por_subunidad[fusedId] (B5).
  // Fallback: si no hay entrada para el ID del paso, probar sus atómicos.
  let subManual = subId ? m.por_subunidad?.[subId] : null;
  if (!subManual && Array.isArray(subUnit?.ids)) {
    for (const atomicId of subUnit.ids) {
      const entry = m.por_subunidad?.[atomicId];
      if (entry?.exposicion) {
        // Esqueleto automático: unir las exposiciones de los atómicos.
        subManual = {
          exposicion: subUnit.ids.map(aid => m.por_subunidad?.[aid]?.exposicion).filter(Boolean).join('\n\n'),
          ejemplo: entry.ejemplo || null,
          cita: entry.cita || null,
        };
        break;
      }
    }
  }

  const paragraphs = [];

  // 1. Transición desde el paso anterior
  // Opción 2: primero se intenta por par de sub-unidades (más específico, evita
  // reusar transiciones cuando un concepto clave aparece en varios pasos),
  // luego por relaciones de tags, y por último por conceptos clave (fallback).
  let transition = null;
  if (!isFirst) {
    if (prevSubId && subId) {
      const arista = lookupArista(m, prevSubId, subId);
      const tagTrans = lookupTagTransition(S, prevSubId, subId, m);
      transition = arista?.transicion || tagTrans;
    }
    if (!transition && prevId && conceptId && prevId !== conceptId) {
      const arista = lookupArista(m, prevId, conceptId);
      if (arista?.transicion) transition = arista.transicion;
    }
  }

  // 2. Cuerpo expositivo principal del paso
  let mainBody = '';
  if (subManual?.exposicion) {
    mainBody = subManual.exposicion;
  } else if (isFirst) {
    if (concepto?.apertura && subUnit?.intro && concepto.apertura !== subUnit.intro) {
      mainBody = `${concepto.apertura}\n\nEn este pasaje (${subUnit.bekker?.join('–') || subId}): ${subUnit.intro}`;
    } else {
      mainBody = concepto?.apertura
        || subUnit?.intro
        || concepto?.definicion_corta
        || subUnit?.titulo
        || '';
    }
  } else {
    mainBody = subUnit?.intro
      || concepto?.definicion_corta
      || concepto?.apertura
      || subUnit?.titulo
      || '';
  }

  if (transition && mainBody) {
    // Evitar duplicar si la exposición ya empieza igual que la transición
    if (!mainBody.startsWith(transition.slice(0, 25))) {
      paragraphs.push(`${transition} ${mainBody}`);
    } else {
      paragraphs.push(mainBody);
    }
  } else if (mainBody) {
    paragraphs.push(mainBody);
  } else if (transition) {
    paragraphs.push(transition);
  }

  // 3. Ejemplo didáctico del manual (si lo tiene para esta sub-unidad)
  if (subManual?.ejemplo) {
    paragraphs.push(subManual.ejemplo);
  }

  // 4. Cita textual destacada del pasaje (si está cargada en el manual)
  if (subManual?.cita) {
    paragraphs.push(`«${subManual.cita}»`);
  }

  const composed = paragraphs.filter(Boolean).join('\n\n').trim();
  if (composed) return composed;
  return subUnit?.intro || subUnit?.titulo || '';
}
