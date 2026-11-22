// Auditoría documental de solo lectura: no normaliza ni reescribe el corpus.
// Complementa, no sustituye, public/tagueo/js/validar.js.
// Identidad compartida (mismo ID) != remisión editorial (remite_a) != evidencia textual.
export const IDENTITY_AUDIT_VERSION = 1;

const str = v => typeof v === 'string' && v.trim() ? v.trim() : null;
const arr = v => Array.isArray(v) ? v : [];
const plain = o => o && typeof o === 'object' && !Array.isArray(o);
const compare = (a, b) => String(a).localeCompare(String(b), 'es');

function flatten(roots, origin, findings) {
  const nodes = new Map(), parents = new Map(), depth = new Map();
  const active = new WeakSet();
  function visit(n, parent, d) {
    if (!plain(n)) { findings.push({ nivel: 'error', codigo: 'NODO_INVALIDO', ubicacion: origin, detalle: 'Se esperaba un nodo objeto.' }); return; }
    if (active.has(n)) { findings.push({ nivel: 'error', codigo: 'CICLO_ARBOL', ubicacion: origin, detalle: 'Árbol con referencia circular.' }); return; }
    const id = str(n.id);
    if (!id) { findings.push({ nivel: 'error', codigo: 'ID_VACIO', ubicacion: origin, detalle: 'Nodo sin identificador.' }); return; }
    if (nodes.has(id)) {
      findings.push({ nivel: 'error', codigo: 'ID_DUPLICADO', ubicacion: `${origin}:${id}`, detalle: 'Identificador repetido dentro de la misma estructura.' });
      return;
    }
    active.add(n);
    nodes.set(id, n); parents.set(id, parent); depth.set(id, d);
    for (const child of arr(n.hijos)) visit(child, id, d + 1);
    active.delete(n);
  }
  for (const root of arr(roots)) visit(root, null, 0);
  return { nodes, parents, depth };
}

function reference(raw, staticNodes) {
  const value = str(raw);
  if (!value) return { valido: false, concepto: null, sentido: null, motivo: 'referencia vacía' };
  const [concepto, ...suffix] = value.split('#');
  const sentido = suffix.length ? suffix.join('#') : null;
  const node = staticNodes.get(concepto);
  if (!node) return { valido: false, concepto, sentido, motivo: 'concepto inexistente en el estático' };
  if (sentido && !arr(node.sentidos).some(s => s.id === sentido)) return { valido: false, concepto, sentido, motivo: 'sentido inexistente en ese concepto' };
  return { valido: true, concepto, sentido, motivo: null };
}

/**
 * @param {{tags:object,estatico:object,funcional:object}} source Bundle completo de /api/contenido.
 * @returns {object} Informe de auditoría determinista y serializable.
 */
export function auditarIdentidadYTagueo(source) {
  const bundle = source?.bundle || source;
  if (!bundle?.estatico?.raices || !bundle?.funcional?.categorias || !bundle?.tags?.unidades || !bundle?.tags?.parrafos) {
    throw new Error('Se necesita el bundle completo de /api/contenido (estatico, funcional y tags).');
  }
  const { estatico, funcional, tags } = bundle;
  const hallazgos = [];
  const add = (nivel, codigo, ubicacion, detalle) => hallazgos.push({ nivel, codigo, ubicacion, detalle });
  const E = flatten(estatico.raices, 'estatico', hallazgos);
  const F = flatten(funcional.categorias, 'funcional', hallazgos);
  const est = E.nodes, fn = F.nodes;
  const shared = [...fn.keys()].filter(id => est.has(id));
  const exclusivos = [...fn.keys()].filter(id => !est.has(id));
  const remisiones = [];
  const aristas = arr(funcional.aristas);
  const edgeIds = new Set();
  const edgeRefs = new Map();

  for (const [id, f] of fn) {
    if (est.has(id) && F.depth.get(id) === 0) add('error', 'COLISION_CATEGORIA', `funcional:${id}`, 'Categoría funcional reutiliza un ID estático; comprobar su papel conceptual.');
    for (const raw of arr(f.remite_a)) {
      const r = reference(raw, est);
      remisiones.push({ origenFuncional: id, destino: raw, ...r });
      if (!r.valido) add('error', 'REMISION_INVALIDA', `funcional:${id}`, `remite_a «${raw}»: ${r.motivo}.`);
    }
    if (!est.has(id) && F.depth.get(id) > 0 && !arr(f.remite_a).length) {
      add('revision', 'FUNCIONAL_SIN_ANCLA_EXPLICITA', `funcional:${id}`, 'Nodo funcional propio sin remite_a; revisar si corresponde una remisión. No implica error.');
    }
    if (est.has(id)) {
      const a = est.get(id);
      // Variación terminológica es habitual y no prueba divergencia conceptual.
      if (str(a.gr) && str(f.gr) && a.gr.trim() !== f.gr.trim()) add('revision', 'GRIEGO_COMPARTIDO_DIFERENTE', `concepto:${id}`, 'El término griego difiere entre las dos representaciones: revisar sin fusionar definiciones.');
    }
  }
  for (const [id, n] of est) {
    const senses = new Set();
    for (const s of arr(n.sentidos)) {
      if (!str(s.id)) { add('error','SENTIDO_SIN_ID',`estatico:${id}`,'Un sentido carece de identificador.'); continue; }
      if (senses.has(s.id)) add('error','SENTIDO_DUPLICADO',`estatico:${id}#${s.id}`,'Sentido repetido en el mismo concepto.');
      senses.add(s.id);
      for (const field of ['en','ver']) if (str(s[field])) {
        const r = reference(s[field], est);
        if (!r.valido) add('error','SENTIDO_REFERENCIA_INVALIDA',`estatico:${id}#${s.id}`,`${field} «${s[field]}»: ${r.motivo}.`);
      }
    }
  }
  for (const e of aristas) {
    if (!str(e.id)) add('error','ARISTA_SIN_ID','funcional:aristas','Falta identificador de arista.');
    else if (edgeIds.has(e.id)) add('error','ARISTA_DUPLICADA',`funcional:arista:${e.id}`,'El ID de arista se repite.');
    if (str(e.id)) edgeIds.add(e.id);
    for (const side of ['de','a']) if (!fn.has(e[side]) || F.depth.get(e[side]) === 0) add('error','ARISTA_EXTREMO_INVALIDO',`funcional:arista:${e.id || '?'}`,`Extremo «${side}» = «${e[side]}» no corresponde a un nodo funcional no categorial.`);
    if (str(e.id)) edgeRefs.set(e.id, e);
  }

  const units = arr(tags.unidades), paras = arr(tags.parrafos), faqs = arr(tags.faqs);
  const unitById = new Map(), paragraphUnits = new Map(), subById = new Map();
  const faqIds = new Set(faqs.map(f => f.id));
  let keyConceptCount = 0, subRelationCount = 0, linkedEdges = 0;
  for (const u of units) {
    if (!str(u.id)) add('error','UNIDAD_SIN_ID','tags:unidades','Unidad sin identificador.');
    if (unitById.has(u.id)) add('error','UNIDAD_DUPLICADA',`unidad:${u.id}`,'Identificador de unidad repetido.');
    unitById.set(u.id, u);
    for (const p of arr(u.parrafos)) {
      const pid = String(p);
      const owners = paragraphUnits.get(pid) || new Set();
      owners.add(u.id); paragraphUnits.set(pid, owners);
    }
    for (const s of arr(u.subunidades)) {
      if (!str(s.id)) add('error','SUBUNIDAD_SIN_ID',`unidad:${u.id}`,'Subunidad sin identificador.');
      if (subById.has(s.id)) add('error','SUBUNIDAD_DUPLICADA',`subunidad:${s.id}`,'ID de subunidad repetido.');
      subById.set(s.id,{...s, unidad: u.id});
      for (const c of arr(s.conceptos_clave)) {
        keyConceptCount++;
        if (!est.has(c)) add('error','CONCEPTO_CLAVE_INVALIDO',`subunidad:${s.id}`,`Concepto clave «${c}» no existe en el estático.`);
      }
      for (const [i,r] of arr(s.relaciones).entries()) {
        subRelationCount++;
        for (const [j,d] of arr(r.destinos).entries()) {
          if (str(d.arista)) {
            linkedEdges++;
            if (!edgeRefs.has(d.arista)) add('error','DESTINO_ARISTA_INVALIDA',`subunidad:${s.id}:relacion:${i}:destino:${j}`,`Arista funcional «${d.arista}» inexistente.`);
          }
          if (str(d.hacia?.faq) && !faqIds.has(d.hacia.faq)) add('error','DESTINO_FAQ_INVALIDA',`subunidad:${s.id}:relacion:${i}:destino:${j}`,`FAQ «${d.hacia.faq}» inexistente.`);
        }
        // de/a pueden contener texto libre, y NO implican por sí solos identificadores erróneos.
      }
    }
  }
  const paragraphIds = new Set();
  const status = {}, levels = {}, conceptTags = new Map();
  for (const p of paras) {
    const pid = String(p.parrafo ?? '');
    if (!pid) add('error','PARRAFO_SIN_ID','tags:parrafos','Párrafo sin identificador.');
    if (paragraphIds.has(pid)) add('error','PARRAFO_DUPLICADO',`parrafo:${pid}`,'Registro de párrafo repetido.');
    paragraphIds.add(pid);
    const st = p.estado || 'sin_estado'; status[st] = (status[st] || 0) + 1;
    if (!['propuesto','confirmado','discusion'].includes(st)) add('revision','ESTADO_DESCONOCIDO',`parrafo:${pid}`,`Estado «${st}»: revisar vocabulario editorial.`);
    const seenTags = new Set();
    for (const [i,t] of arr(p.conceptos).entries()) {
      const loc = `parrafo:${pid}:tag:${i+1}`;
      if (!est.has(t.c)) { add('error','TAG_CONCEPTO_INVALIDO',loc,`Concepto «${t.c}» no existe en el árbol estático.`); continue; }
      if (str(t.s) && !arr(est.get(t.c).sentidos).some(s => s.id === t.s)) add('error','TAG_SENTIDO_INVALIDO',loc,`Sentido «${t.c}#${t.s}» no existe en el estático.`);
      const lv = t.n || 'sin_nivel'; levels[lv] = (levels[lv] || 0) + 1;
      if (!['central','presente','mencion'].includes(lv)) add('revision','NIVEL_TAG_INUSUAL',loc,`Nivel «${lv}»: revisar convención.`);
      const key = `${t.c}#${t.s || ''}`;
      if (seenTags.has(key)) add('revision','TAG_REPETIDO',loc,`Mismo concepto/sentido «${key}» etiquetado varias veces en el párrafo.`);
      seenTags.add(key);
      conceptTags.set(t.c,(conceptTags.get(t.c) || 0) + 1);
      if (t.via != null && t.implicito !== true) add('error','VIA_SIN_IMPLICITO',loc,'La vía requiere un tag marcado como implícito.');
      if (t.implicito === true && t.via != null && (!str(t.via) || !str(t.ref))) add('error','VIA_IMPLICITA_SIN_CITA',loc,'Una vía de lectura implícita requiere texto y referencia.');
    }
  }
  for (const [pid, owners] of paragraphUnits) {
    if (!paragraphIds.has(pid)) add('error','UNIDAD_PARRAFO_SIN_TAG',`parrafo:${pid}`,`Asignado a unidad(es) ${[...owners].join(', ')}, pero falta el registro de tags.`);
    if (owners.size > 1) add('revision','PARRAFO_MULTIPLES_UNIDADES',`parrafo:${pid}`,`Asignado a ${[...owners].join(', ')}; puede ser un solapamiento editorial.`);
  }
  for (const pid of paragraphIds) if (!paragraphUnits.has(pid)) add('revision','PARRAFO_SIN_UNIDAD',`parrafo:${pid}`,'Párrafo etiquetado sin unidad asignada.');
  for (const faq of faqs) {
    const id = faq.id || '?';
    if (str(faq.arbol?.nodo) && !est.has(faq.arbol.nodo) && !fn.has(faq.arbol.nodo)) add('error','FAQ_FOCO_INVALIDO',`faq:${id}`,`Foco «${faq.arbol.nodo}» no existe ni en el árbol estático ni en el funcional.`);
    for (const p of arr(faq.pasajes)) if (str(p.ref) && !subById.has(p.ref)) add('revision','FAQ_PASAJE_SIN_SUBUNIDAD',`faq:${id}`,`Pasaje «${p.ref}» no corresponde a subunidad en este bundle; revisar el tipo de ancla.`);
  }

  const identidades = [...new Set([...est.keys(),...fn.keys()])].sort(compare).map(id => ({
    id, estatica: est.has(id), funcional: fn.has(id),
    clase: est.has(id) && fn.has(id) ? 'compartido' : est.has(id) ? 'solo_estatico' : 'solo_funcional',
    categoriaFuncional: fn.has(id) && F.depth.get(id) === 0,
    remisionesSalientes: remisiones.filter(r => r.origenFuncional === id).map(r => r.destino),
  }));
  hallazgos.sort((a,b)=>compare(a.nivel,b.nivel)||compare(a.codigo,b.codigo)||compare(a.ubicacion,b.ubicacion));
  return {
    version: IDENTITY_AUDIT_VERSION,
    versionCorpus: tags.version || 'sin_version',
    semantica: {
      identidad: 'Mismo ID estático y funcional: misma entidad conceptual, facetas documentales distintas.',
      remision: 'remite_a: vínculo editorial explícito, no identidad automática.',
      evidencia: 'Tag de párrafo o subunidad: índice documental; no prueba por sí solo una relación filosófica.'
    },
    resumen: {
      conceptosEstaticos: est.size, nodosFuncionales: fn.size, identidadesCompartidas: shared.length,
      soloEstaticos: est.size - shared.length, soloFuncionales: exclusivos.length,
      categoriasFuncionales: [...F.depth.values()].filter(d=>d===0).length,
      remisionesExplicitas: remisiones.length, aristasFuncionales: aristas.length,
      unidades: units.length, subunidades: subById.size, parrafosEtiquetados: paras.length,
      faqs: faqs.length, conceptosClaveSubunidad: keyConceptCount,
      relacionesSubunidad: subRelationCount, destinosReferencianArista: linkedEdges,
      estadosParrafo: status, nivelesTag: levels,
      errores: hallazgos.filter(h=>h.nivel==='error').length,
      revisiones: hallazgos.filter(h=>h.nivel==='revision').length
    },
    identidades, remisiones, hallazgos,
  };
}
