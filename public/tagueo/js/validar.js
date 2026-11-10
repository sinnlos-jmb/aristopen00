// Validaciones del tagueo. Sin DOM: las usa la vista Control y tools/validar-tagueo.mjs.
import { anchorsOf, trayecto, desc, molde, colSteps, mapaRef, mapaRefs } from './store.js';
import { CONFIG } from './config.js';
export function validar(S) {
  const errs = [], warns = [], oks = [], T = S.tree, G = S.tags, N = S.N;
  // árbol estático
  const VOZ = ['textual', 'nuestra', 'comentarista'];
  const dup = [...new Set(S.ids.filter((i, k) => S.ids.indexOf(i) !== k))];
  if (dup.length) errs.push('Estático: ids duplicados: ' + dup.join(', '));
  const refOk = r => { const [c, x] = r.split('#'); return N[c] && (!x || (N[c].sentidos || []).some(z => z.id === x)); };
  Object.entries(N).forEach(([i, n]) => {
    if (n.depth > T.max_profundidad) errs.push(`Estático: «${i}» supera la profundidad máxima (${n.depth}).`);
    if (n.depth > 1 && !['especie', 'parte', 'division', 'agrupacion'].includes(n.rel)) errs.push(`Estático: «${i}» tiene relación de padre inválida (${n.rel}).`);
    if (n.depth > 1 && !VOZ.includes(n.voz)) errs.push(`Estático: «${i}» no tiene voz en la relación con su padre.`);
    if (n.depth === 1 && !n.categoria) warns.push(`Estático: la raíz «${i}» no tiene categoría aristotélica.`);
    const sid = (n.sentidos || []).map(z => z.id); if (new Set(sid).size !== sid.length) errs.push(`Estático: «${i}» tiene sentidos repetidos.`);
    (n.sentidos || []).forEach(z => ['en', 'ver'].forEach(k => { if (z[k] && !refOk(z[k])) errs.push(`Estático: «${i}» · sentido «${z.id}» (${k}) apunta a «${z[k]}», que no existe.`); }));
    Object.entries(n.atributos || {}).forEach(([k, v]) => [].concat(v).forEach(x => {
      if (['sede', 'esfera', 'medio', 'opuestos', 'doble'].includes(k) && /^[a-z_]+$/.test(x) && !N[x]) errs.push(`Estático: «${i}» → ${k} «${x}» no existe.`);
    }));
  });
  oks.push(`Estático: ${Object.keys(N).length} nodos en ${T.raices.length} raíces, profundidad máxima ${Math.max(...Object.values(N).map(n => n.depth))} de ${T.max_profundidad}, ${Object.values(N).reduce((a, n) => a + (n.sentidos || []).length, 0)} sentidos.`);
  // red funcional
  const F = S.FN, FT = S.ftree, fdup = [...new Set(S.fids.filter((i, k) => S.fids.indexOf(i) !== k))];
  if (fdup.length) errs.push('Funcional: ids duplicados: ' + fdup.join(', '));
  Object.entries(F).forEach(([i, f]) => {
    if (f.depth > FT.max_profundidad) errs.push(`Funcional: «${i}» supera la profundidad máxima (${f.depth}).`);
    if (f.depth > 1 && !['especie', 'parte', 'agrupacion'].includes(f.rel)) errs.push(`Funcional: «${i}» tiene relación de padre inválida (${f.rel}).`);
    if (f.depth > 1 && !VOZ.includes(f.voz)) errs.push(`Funcional: «${i}» no tiene voz.`);
    if (N[i] && f.depth === 1) errs.push(`Funcional: la categoría «${i}» choca con un id del estático.`);
    if (f.kind === 'propio' && !(f.remite_a || []).length) warns.push(`Funcional: «${i}» es propio y no remite a nada del estático.`);
    (f.remite_a || []).forEach(r => { if (!refOk(r)) errs.push(`Funcional: «${i}» remite a «${r}», que no existe en el estático.`); });
  });
  const eids = new Set();
  S.FE.forEach(e => {
    if (eids.has(e.id)) errs.push(`Funcional: arista duplicada «${e.id}».`); eids.add(e.id);
    [e.de, e.a].forEach(x => { if (!F[x] || F[x].depth === 1) errs.push(`Funcional: la arista «${e.id}» apunta a «${x}», que no es un nodo funcional.`); });
    if (!FT.relaciones_arista[e.rel]) errs.push(`Funcional: la arista «${e.id}» tiene relación inválida (${e.rel}).`);
    if (!VOZ.includes(e.voz)) errs.push(`Funcional: la arista «${e.id}» no tiene voz.`);
    if (e.nota_trayecto && (!VOZ.includes(e.nota_trayecto.voz) || !e.nota_trayecto.t || !e.nota_trayecto.ref || (e.nota_trayecto.sub && !S.SUB[e.nota_trayecto.sub]))) errs.push(`Funcional: la nota de trayecto de «${e.id}» es inválida.`);
    if (e.grafo && S.refs && !S.refById[`${e.grafo.file}|arista|${e.grafo.edge}`]) errs.push(`Funcional: la arista «${e.id}» cita «${e.grafo.edge}», que no existe en ${e.grafo.file}.`);
  });
  const compart = S.fids.filter(i => F[i].kind === 'compartido').length;
  oks.push(`Funcional: ${S.fids.length} nodos (${compart} compartidos con el estático), ${S.FE.length} aristas (${S.FE.filter(e => e.voz === 'nuestra').length} de lectura nuestra).`);
  const sinAncla = Object.keys(N).filter(i => N[i].depth > 1 && !anchorsOf(S, i, null).length);
  (sinAncla.length ? warns : oks).push(sinAncla.length ? `Anclaje: ${sinAncla.length} nodos del estático sin ancla en el funcional: ${sinAncla.join(', ')}.` : 'Anclaje: todos los nodos del estático (salvo las raíces) tienen ancla en el funcional.');
  const aisl = S.fids.filter(i => F[i].depth > 1 && (CONFIG.polos.some(p => !trayecto(S, i, p))));
  (aisl.length ? warns : oks).push(aisl.length ? `Trayectos: nodos funcionales sin camino a algún polo: ${aisl.join(', ')}.` : `Trayectos: todos los nodos funcionales llegan a ${CONFIG.polos.map(p => F[p]?.label).join(' y ')}.`);
  // molde de trayectos
  CONFIG.polos.forEach(p => { const P = FT.plantilla?.[p];
    if (!P) { errs.push(`Funcional: falta el molde de trayecto para «${p}».`); return; }
    P.columna.forEach(x => { if (!F[x] || F[x].depth === 1) errs.push(`Funcional: el molde «${p}» usa «${x}», que no es un nodo funcional.`); });
    if (!P.columna.includes(p)) errs.push(`Funcional: el molde «${p}» no incluye el polo.`);
    colSteps(S, P.columna).forEach(st => { if (st.falta) errs.push(`Funcional: el molde «${p}» no tiene arista entre «${st.de}» y «${st.a}».`); });
  });
  const sinMolde = S.fids.filter(i => F[i].depth > 1 && CONFIG.polos.some(p => !molde(S, [i], p)));
  (sinMolde.length ? warns : oks).push(sinMolde.length ? `Molde: nodos sin entrada al molde de algún polo: ${sinMolde.join(', ')}.` : 'Molde: todos los nodos funcionales entran a los dos moldes.');
  oks.push(`Texto: ${S.pars.length} párrafos en ${new Set(S.pars.map(p => p.cap)).size} capítulos (${G.texto_base}).`);
  // unidades
  const cover = new Set(), seen = new Set();
  G.unidades.forEach(u => {
    u.parrafos.forEach(n => { cover.add(n); if (!S.P[n]) errs.push(`Unidad ${u.id}: el párrafo ${n} no existe.`); });
    u.subunidades.forEach(s => {
      if (seen.has(s.id)) errs.push(`Unidades: sub-unidad duplicada «${s.id}».`); seen.add(s.id);
      s.anclas_rotas.forEach(x => errs.push(`Ancla rota en ${u.id} › ${s.id}: ${x}.`));
      if (s.intro != null && !String(s.intro).trim()) errs.push(`${s.id}: «intro» vacío.`);
      (s.pilares || []).forEach(x => { if (!(G.pilares || []).some(p => p.id === x)) errs.push(`${s.id}: el pilar «${x}» no existe.`); });
      (s.conceptos_clave || []).forEach(c => { if (!N[c]) errs.push(`${s.id}: concepto clave «${c}» no está en el estático.`); });
      const DT = new Set((T.destinos || []).map(d => d.id));
      (s.relaciones || []).forEach(r => (r.destinos || []).forEach(d => {
        if (!DT.has(d.tipo)) errs.push(`${s.id}: destino con tipo inválido «${d.tipo}».`);
        if (!d.ref) errs.push(`${s.id}: destino sin cita.`);
        if (d.arista && !S.FE.some(e => e.id === d.arista)) errs.push(`${s.id}: el destino cita la arista funcional «${d.arista}», que no existe.`);
        if (d.hacia?.faq && !S.FAQ[d.hacia.faq]) errs.push(`${s.id}: el destino remite a la FAQ «${d.hacia.faq}», que no existe.`);
        if (d.hacia && !d.hacia.faq && !d.hacia.meta) errs.push(`${s.id}: destino con «hacia» vacío.`);
      }));
      if (u.grafo && S.refs) (s.grafo_aristas || []).forEach(e => { if (!S.refById[`${u.grafo.file}|arista|${e}`]) errs.push(`${s.id}: la arista «${e}» no existe en ${u.grafo.file}.`); });
    });
    if (u.grafo && S.refs && !S.refs.some(x => x.file === u.grafo.file)) errs.push(`Unidad ${u.id}: el grafo ${u.grafo.file} no figura en el índice de grafos.`);
  });
  // claves de lectura y articulación (D26): registro, momentos con sub-unidades de la unidad, claves de sub-unidades e implícitos
  const CL = G.claves || [], clIds = new Set();
  CL.forEach(x => {
    if (clIds.has(x.id)) errs.push(`Claves: id repetido «${x.id}».`); clIds.add(x.id);
    if (!N[x.nodo]) errs.push(`Clave ${x.id}: el nodo «${x.nodo}» no está en el estático.`);
    if (!x.label || !x.nombre || !x.aporta || !String(x.t || '').trim() || !x.ref) errs.push(`Clave ${x.id}: falta etiqueta, nombre, aporte, texto o cita.`);
    if (!T.voces_anotacion[x.voz]) errs.push(`Clave ${x.id}: voz inválida «${x.voz}».`);
  });
  let nMom = 0, nSc = 0;
  G.unidades.forEach(u => {
    const a = u.articulacion, uS = new Set(u.subunidades.map(s => s.id));
    u.subunidades.forEach(s => (s.claves || []).forEach(x => { nSc++;
      if (!clIds.has(x.k)) errs.push(`${s.id}: la clave «${x.k}» no está en el registro de claves.`);
      if (!String(x.t || '').trim()) errs.push(`${s.id}: la clave «${x.k}» no tiene texto.`);
      if (!T.voces_anotacion[x.voz]) errs.push(`${s.id}: voz inválida «${x.voz}» en la clave «${x.k}».`);
      if (a && !(a.claves || []).includes(x.k)) warns.push(`${s.id}: usa la clave «${x.k}», que no figura en la articulación de la unidad.`); }));
    if (!a) return;
    if (!T.voces_anotacion[a.voz]) errs.push(`Unidad ${u.id}: voz inválida en la articulación («${a.voz}»).`);
    (a.claves || []).forEach(k => { if (!clIds.has(k)) errs.push(`Unidad ${u.id}: la articulación usa la clave «${k}», que no está en el registro.`); });
    const mids = (a.momentos || []).map(m => m.id), inM = {};
    if (new Set(mids).size !== mids.length) errs.push(`Unidad ${u.id}: momentos con id repetido.`);
    (a.momentos || []).forEach(m => { nMom++;
      if (!m.titulo || !String(m.t || '').trim()) errs.push(`Unidad ${u.id}: al momento ${m.id} le falta título o texto.`);
      if (!(m.subs || []).length) errs.push(`Unidad ${u.id}: el momento ${m.id} no tiene sub-unidades.`);
      (m.subs || []).forEach(id => { if (!uS.has(id)) errs.push(`Unidad ${u.id}: el momento ${m.id} cita «${id}», que no es una sub-unidad de la unidad.`);
        if (inM[id]) errs.push(`Unidad ${u.id}: la sub-unidad «${id}» está en los momentos ${inM[id]} y ${m.id}.`); inM[id] = m.id; }); });
    const ord = u.subunidades.map(s => s.id).filter(id => inM[id]), flat = (a.momentos || []).flatMap(m => m.subs || []);
    if (ord.join() !== flat.filter(id => uS.has(id)).join()) warns.push(`Unidad ${u.id}: los momentos no siguen el orden de las sub-unidades.`);
    const fuera = u.subunidades.filter(s => !inM[s.id]).map(s => s.id);
    (fuera.length ? warns : oks).push(fuera.length ? `Unidad ${u.id}: sub-unidades sin momento: ${fuera.join(', ')}.` : `Articulación ${u.id}: ${mids.length} momentos cubren las ${u.subunidades.length} sub-unidades; ${(a.claves || []).length ? 'claves ' + a.claves.join(', ') : 'sin claves'}.`);
  });
  if (CL.length) oks.push(`Claves de lectura: ${CL.length} en el registro (${CL.map(x => x.label).join(', ')}), usadas en ${nSc} anotaciones de sub-unidades; ${nMom} momentos de articulación.`);
  const miss = S.pars.map(p => p.nro).filter(n => !cover.has(n));
  (miss.length ? errs : oks).push(miss.length ? `Cobertura: párrafos sin unidad: ${miss.join(', ')}` : `Cobertura: los ${S.pars.length} párrafos están en alguna unidad (${G.unidades.length} unidades, ${seen.size} sub-unidades).`);
  // párrafos
  Object.entries(S.TP).forEach(([n, tp]) => {
    if (!S.P[n]) errs.push(`Tags: el párrafo ${n} no existe en el texto.`);
    tp.conceptos.forEach(k => {
      if (!N[k.c]) errs.push(`Párrafo ${n}: concepto «${k.c}» no está en el estático.`);
      else if (k.s && !(N[k.c].sentidos || []).some(x => x.id === k.s)) errs.push(`Párrafo ${n}: sentido «${k.s}» no existe en «${k.c}».`);
      if (!T.niveles[k.n]) errs.push(`Párrafo ${n}: nivel inválido «${k.n}».`);
      if (k.via != null && !k.implicito) errs.push(`Párrafo ${n}: «${k.c}» tiene vía pero no está marcado implícito.`);
      if (k.implicito && k.via != null && (!String(k.via).trim() || !k.ref)) errs.push(`Párrafo ${n}: el implícito «${k.c}» tiene vía sin texto o sin cita.`);
      if (k.recurso != null && !(G.recursos || []).some(z => z.id === k.recurso)) errs.push(`Párrafo ${n}: «${k.c}» tiene el recurso «${k.recurso}», que no está en el registro de recursos.`);
      if (k.recurso != null && !(k.implicito && k.via)) errs.push(`Párrafo ${n}: «${k.c}» tiene recurso pero no es un implícito con vía.`);
      (k.claves || []).forEach(x => { if (!(G.claves || []).some(z => z.id === x)) errs.push(`Párrafo ${n}: «${k.c}» cita la clave «${x}», que no está en el registro.`); });
    });
    (tp.voz_texto || []).forEach(v => { if (!T.voces_texto[v]) errs.push(`Párrafo ${n}: voz del texto inválida «${v}».`); });
    (tp.notas || []).forEach(x => { if (!T.voces_anotacion[x.voz]) errs.push(`Párrafo ${n}: voz de nota inválida «${x.voz}».`); if (x.bekker?.includes("-") && !S.SUB[x.bekker]) warns.push(`Párrafo ${n}: la nota cita la sub-unidad «${x.bekker}», que no existe.`); });
    (tp.faq || []).forEach(f => { if (!S.FAQ[f]) errs.push(`Párrafo ${n}: FAQ «${f}» no existe.`); });
  });
  const impV = Object.values(S.TP).flatMap(tp => tp.conceptos.filter(k => k.implicito && k.via));
  if (impV.length) oks.push(`Implícitos con vía: ${impV.length} (${impV.filter(k => k.claves?.length).length} con clave de lectura), todos con cita.`);
  const recN = {}; impV.forEach(k => { if (k.recurso) recN[k.recurso] = (recN[k.recurso] || 0) + 1; });
  (G.recursos || []).forEach(x => { if (!x.label || !String(x.t || '').trim()) errs.push(`Recurso ${x.id}: falta etiqueta o texto.`); });
  if (Object.keys(recN).length) oks.push(`Activación indirecta (D28): ${Object.values(recN).reduce((a, b) => a + b, 0)} implícitos con recurso (${(G.recursos || []).filter(x => recN[x.id]).map(x => `${x.label} ${recN[x.id]}`).join(', ')}).`);
  const sinRec = impV.filter(k => !k.recurso).length; if (sinRec) oks.push(`Activación directa: ${sinRec} implícitos con vía sin recurso.`);
  // coherencia sub-unidad ↔ párrafos
  const coh = [];
  Object.values(S.SUB).forEach(s => (s.conceptos_clave || []).forEach(c => {
    const ds = desc(S, c), has = n => S.TP[n].conceptos.some(k => ds.has(k.c)); // el género queda cubierto por sus especies
    s.pars.forEach(n => coh.push({sub: s.id, c, p: n, st: !S.TP[n] ? 'pendiente' : (has(n) ? 'ok' : 'falta')}));
    const tagged = s.pars.filter(n => S.TP[n]);
    if (tagged.length && !tagged.some(has)) warns.push(`${s.id}: «${c}» es concepto clave pero no está tagueado en el párrafo ${tagged.join(', ')}.`);
  }));
  const pend = [...new Set(coh.filter(x => x.st === 'pendiente').map(x => x.p))].sort((a, b) => a - b);
  if (pend.length) oks.push(`Coherencia: sub-unidades en párrafos sin tags v3 todavía (${pend.join(', ')}): quedan pendientes.`);
  // FAQ
  (G.pilares || []).forEach(p => { if (p.faq && !S.FAQ[p.faq]) errs.push(`Pilar ${p.id}: la FAQ «${p.faq}» no existe.`); if (p.voz && p.voz !== 'nuestra') errs.push(`Pilar ${p.id}: voz inválida («${p.voz}»; solo 'nuestra').`); });
  // Definiciones por etapas (D22): concepto, etapas numeradas, voces, niveles y lugares existentes
  (G.definiciones || []).forEach(d => {
    if (!N[d.concepto]) errs.push(`Definición ${d.id}: el concepto «${d.concepto}» no está en el estático.`);
    if (!d.referencia?.t) warns.push(`Definición ${d.id}: falta la definición de referencia.`);
    if (d.lectura && !T.voces_anotacion[d.lectura.voz]) errs.push(`Definición ${d.id}: voz inválida en la lectura («${d.lectura.voz}»).`);
    (d.etapas || []).forEach((e, k) => {
      if (e.n !== k + 1) errs.push(`Definición ${d.id}: la etapa ${k + 1} tiene número ${e.n}.`);
      if (!e.ref || !e.label || !e.t) errs.push(`Definición ${d.id}: a la etapa ${k + 1} le falta cita, título o texto.`);
      if (!T.voces_texto[e.voz]) errs.push(`Definición ${d.id}: voz del texto inválida «${e.voz}» en la etapa ${k + 1}.`);
      if (!['intro', 'avanzado'].includes(e.nivel)) errs.push(`Definición ${d.id}: nivel inválido «${e.nivel}» en la etapa ${k + 1}.`);
      if (e.a && !mapaRef(S, e.a)) errs.push(`Definición ${d.id}: la etapa ${k + 1} remite a «${e.a}», que no existe (usar unidad:, sub: o super:).`);
      (e.subs || []).forEach(x => { if (!S.SUB[x]) errs.push(`Definición ${d.id}: la etapa ${k + 1} cita la sub-unidad «${x}», que no existe.`); });
    });
  });
  G.faqs.forEach(f => { if (f.definicion && !S.DEF[f.definicion]) errs.push(`FAQ ${f.id}: la definición «${f.definicion}» no existe.`); });
  if ((G.definiciones || []).length) oks.push(`Definiciones por etapas: ${G.definiciones.length} (${G.definiciones.map(d => `${S.N[d.concepto]?.label || d.concepto}: ${d.etapas.length} etapas, ${Object.values(S.DEFSUB).flat().filter(x => x.d === d).length} en sub-unidades`).join('; ')}).`);
  // Para profundizar (D20): temas reservados; cada uno con cita y lugares existentes
  const ppIds = new Set();
  (G.para_profundizar || []).forEach(x => {
    if (ppIds.has(x.id)) errs.push(`Para profundizar: id repetido «${x.id}».`); ppIds.add(x.id);
    if (!x.tema || !x.ref) errs.push(`Para profundizar «${x.id}»: falta tema o cita.`);
    (x.donde || []).forEach(id => { if (!S.SUB[id]) errs.push(`Para profundizar «${x.id}»: la sub-unidad «${id}» no existe.`); });
  });
  if ((G.para_profundizar || []).length) oks.push(`Para profundizar: ${G.para_profundizar.length} temas reservados, con cita y lugar.`);
  G.faqs.forEach(f => f.pasajes.forEach(({ref}) => {
    if (ref.startsWith('u:')) { if (!S.U[ref.slice(2)]) errs.push(`FAQ ${f.id}: unidad «${ref.slice(2)}» no existe.`); }
    else if (!S.SUB[ref]) errs.push(`FAQ ${f.id}: sub-unidad «${ref}» no existe.`);
  }));
  // FAQ en árbol (D21): cada pregunta cuelga de un nodo del funcional, dentro de su categoría
  const catIds = new Set(S.ftree.categorias.map(c => c.id));
  const enArbol = a => a && catIds.has(a.cat) && F[a.nodo] && F[a.nodo].depth > 1 && F[a.nodo].path[0] === a.cat;
  G.faqs.forEach(f => {
    if (!f.arbol) errs.push(`FAQ ${f.id}: falta «arbol» (categoría › nodo del funcional).`);
    else if (!enArbol(f.arbol)) errs.push(`FAQ ${f.id}: «arbol» apunta a ${f.arbol.cat} › ${f.arbol.nodo}, que no es un nodo de esa categoría del funcional.`);
    (f.tambien || []).forEach(b => { if (!enArbol(b)) errs.push(`FAQ ${f.id}: «tambien» apunta a ${b.cat} › ${b.nodo}, que no es un nodo de esa categoría del funcional.`); });
  });
  const fqN = new Set(G.faqs.filter(f => f.arbol).map(f => f.arbol.nodo)), fqC = new Set(G.faqs.filter(f => f.arbol).map(f => f.arbol.cat));
  oks.push(`FAQ: ${G.faqs.length} preguntas en el árbol del funcional (${fqN.size} nodos de ${fqC.size} categorías).`);
  // firmas y respuesta en borrador (D35, D41)
  const objOk = o => { const [tp, id] = String(o).split(/:(.*)/s);
    if (tp === 'func') return !!F[id];
    if (tp === 'static') return !!N[id];
    if (tp === 'sense') { const [c, x] = id.split('#'); return !!(N[c] && x && (N[c].sentidos || []).some(z => z.id === x)); }
    if (tp === 'fedge') return S.FE.some(e => e.id === id);
    return false; };
  let nFi = 0, nRe = 0;
  G.faqs.forEach(f => {
    if (!f.firmas?.length) warns.push(`FAQ ${f.id}: sin firmas (D35).`);
    (f.firmas || []).forEach((x, i) => { nFi++; const it = CONFIG.intenciones[x.intent], d = `FAQ ${f.id}, firma ${i + 1}`;
      if (!it) { errs.push(`${d}: intención desconocida «${x.intent}».`); return; }
      const A = x.arguments || [];
      if (A.length < it[1] || A.length > it[2]) errs.push(`${d}: «${x.intent}» admite de ${it[1]} a ${it[2]} objetos (tiene ${A.length}).`);
      A.forEach(o => { if (!objOk(o)) errs.push(`${d}: el objeto «${o}» no existe (func:, static:, sense:c#s o fedge:a--b).`);
        else if (!it[3] && String(o).startsWith('fedge:')) errs.push(`${d}: «${x.intent}» no admite aristas («${o}»).`); });
      if (x.operation != null && !CONFIG.operaciones[x.operation]) errs.push(`${d}: operación desconocida «${x.operation}».`);
      if (x.operation != null && x.intent !== 'examinar') warns.push(`${d}: la operación solo se usa con «examinar».`); });
    (f.respuesta || []).forEach((x, i) => { nRe++; const d = `FAQ ${f.id}, respuesta ${i + 1}`;
      if (!String(x.t || '').trim() || !String(x.ref || '').trim()) errs.push(`${d}: falta texto o ref.`);
      if (!T.voces_anotacion[x.voz]) errs.push(`${d}: voz inválida «${x.voz}».`);
      if (!CONFIG.rolesRespuesta.includes(x.rol)) errs.push(`${d}: rol inválido «${x.rol}».`);
      if (x.estado !== 'borrador') errs.push(`${d}: estado «${x.estado}» (D35: «borrador»).`);
      if (x.sub && !S.SUB[x.sub]) errs.push(`${d}: la sub-unidad «${x.sub}» no existe.`); });
  });
  oks.push(`Firmas de FAQ (D35): ${nFi} firmas en ${G.faqs.filter(f => f.firmas?.length).length} de ${G.faqs.length} preguntas; ${nRe} afirmaciones de respuesta en borrador en ${G.faqs.filter(f => f.respuesta?.length).length}.`);
  // Mapa de la obra (D21): super-unidades que agrupan libros; referencias «mapa» de sub-unidades y notas
  const MP = G.mapa;
  if (!MP) warns.push('Mapa: falta la lista de super-unidades (tags.mapa).');
  else {
    const sids = MP.super_unidades.map(x => x.id), libs = MP.super_unidades.flatMap(x => x.libros.map(l => l.n));
    if (new Set(sids).size !== sids.length) errs.push('Mapa: super-unidades con id repetido.');
    if (new Set(libs).size !== libs.length) errs.push('Mapa: un libro figura en más de una super-unidad.');
    if (!libs.includes(MP.libro_tagueado)) errs.push(`Mapa: el libro tagueado «${MP.libro_tagueado}» no está en ninguna super-unidad.`);
    const R = mapaRefs(S);
    R.forEach(m => { const d = m.desde.sub ? m.desde.sub : `párrafo ${m.desde.parrafo}, nota ${m.desde.nota + 1}`;
      if (!m.a) errs.push(`Mapa: referencia sin destino en ${d}.`);
      else if (!mapaRef(S, m.a)) errs.push(`Mapa: ${d} remite a «${m.a}», que no existe (usar unidad:, sub: o super:).`); });
    const conRef = new Set(R.filter(m => m.desde.sub).map(m => m.desde.sub)).size;
    oks.push(`Mapa: ${sids.length} super-unidades, ${libs.length} libros; ${R.length} referencias «mapa» (${conRef} de ${seen.size} sub-unidades tienen alguna).`);
  }
  // esquema para la recuperación (D35): conceptos propios de las notas y relaciones de sub-unidad con «ref»
  let nNc = 0, nRel = 0, nRelRef = 0;
  const notasDe = [...G.unidades.flatMap(u => u.subunidades.map(s => [s.id, s.notas || []])), ...G.parrafos.map(p => [`párrafo ${p.parrafo}`, p.notas || []])];
  notasDe.forEach(([d, ns]) => ns.forEach(x => { if (!x.c) return; nNc++;
    if (!Array.isArray(x.c) || !x.c.length || x.c.length > 3) warns.push(`${d}: la nota lleva «c» con ${x.c?.length ?? 0} conceptos (D35: de uno a tres).`);
    (x.c || []).forEach(c => { if (!N[c]) errs.push(`${d}: la nota cita el concepto «${c}», que no está en el estático.`); }); }));
  G.unidades.forEach(u => u.subunidades.forEach(s => (s.relaciones || []).forEach(r => { nRel++;
    if (r.ref != null) { nRelRef++; if (typeof r.ref !== 'string' || !r.ref.trim()) errs.push(`${s.id}: relación con «ref» vacía.`); }
    if (!T.voces_anotacion[r.voz]) errs.push(`${s.id}: voz inválida «${r.voz}» en una relación.`); })));
  oks.push(`Esquema D35: ${nNc} notas con conceptos propios; ${nRelRef} de ${nRel} relaciones de sub-unidad con «ref».`);
  // voces de la tradición (D36)
  const TRT = ['verso', 'epigrama', 'proverbio', 'dicho', 'anecdota'], TRU = ['autoridad', 'confirmacion', 'contraste', 'ejemplo', 'relectura'];
  const nrm = x => String(x || '').replace(/1\d{3}[ab]|\[\d{1,2}\]/g, ' ').replace(/[\s·.,;]+/g, ' ').trim();
  const trIds = new Set();
  (G.tradicion || []).forEach(x => {
    if (trIds.has(x.id)) errs.push(`Tradición: id repetido «${x.id}».`); trIds.add(x.id);
    if (!TRT.includes(x.tipo)) errs.push(`Tradición ${x.id}: tipo inválido «${x.tipo}».`);
    if (!TRU.includes(x.uso)) errs.push(`Tradición ${x.id}: uso inválido «${x.uso}».`);
    if (!T.voces_anotacion[x.voz]) errs.push(`Tradición ${x.id}: voz inválida «${x.voz}».`);
    if (!x.ref || !x.gr || !x.es || !x.lectura) errs.push(`Tradición ${x.id}: faltan ref, griego, versión o lectura.`);
    if (!x.fuente?.autor) errs.push(`Tradición ${x.id}: falta el autor de la fuente.`);
    (x.c || []).forEach(c => { if (!N[c]) errs.push(`Tradición ${x.id}: el concepto «${c}» no está en el estático.`); });
    (x.vinculos || []).forEach(m => { if (!mapaRef(S, m.a)) errs.push(`Tradición ${x.id}: el vínculo «${m.a}» no existe.`); });
    if (x.fuera) { if (x.sub) warns.push(`Tradición ${x.id}: está marcada fuera del libro pero tiene sub-unidad.`); return; }
    const s = S.SUB[x.sub];
    if (!s) { errs.push(`Tradición ${x.id}: la sub-unidad «${x.sub}» no existe.`); return; }
    if (!nrm(s.gr_txt).includes(nrm(x.gr))) errs.push(`Tradición ${x.id}: el griego no está en el texto de la sub-unidad ${x.sub}.`);
  });
  if ((G.tradicion || []).length) oks.push(`Tradición: ${G.tradicion.length} voces (${G.tradicion.filter(x => !x.fuera).length} en el libro, con su griego en el texto; ${G.tradicion.filter(x => x.fuera).length} fuera).`);
  // voz de aristas de grafos registrada en el tagueo
  (G.voces_grafos || []).forEach(x => {
    if (S.refs && !S.refById[`${x.file}|arista|${x.edge}`]) errs.push(`Voces de grafos: la arista «${x.edge}» no existe en ${x.file}.`);
    (x.voz || []).forEach(z => { if (!T.voces_anotacion[z]) errs.push(`Voces de grafos: voz inválida «${z}» en ${x.edge}.`); });
  });
  // grafos (D35, D42): concepto de los nodos, referencias de cotejo y voz de las aristas de los grafos de unidad
  if (S.refs) {
    const okC = i => !!(N[i] || S.FN[i]);
    const nodos = S.refs.filter(x => x.kind === 'nodo'), aris = S.refs.filter(x => x.kind === 'arista');
    nodos.filter(x => x.concepto && !okC(x.concepto)).forEach(x => errs.push(`Grafos: el nodo «${x.id}» de ${x.file} tiene concepto «${x.concepto}», que no es un id del tagueo.`));
    aris.filter(x => x.raw_cf && !(x.refs_cf || []).length).forEach(x => warns.push(`Grafos: la arista «${x.id}» de ${x.file} tiene ref_cf sin leer («${x.raw_cf}»).`));
    const pend = {}; nodos.filter(x => !okC(x.cid)).forEach(x => { pend[x.graph] = (pend[x.graph] || 0) + 1; });
    oks.push(`Grafos (D35): ${nodos.length - Object.values(pend).reduce((a, b) => a + b, 0)} de ${nodos.length} nodos con concepto del tagueo (${nodos.filter(x => x.concepto).length} por el campo concepto); ${aris.filter(x => x.raw_cf).length} aristas con ref_cf. Pendientes por grafo: ${Object.entries(pend).map(([g, n]) => `${g} ${n}`).join(', ') || 'ninguno'}.`);
    const ufiles = [...new Set(G.unidades.filter(u => u.grafo).map(u => u.grafo.file))];
    ufiles.forEach(f => { const sin = aris.filter(x => x.file === f && !S.VG[`${f}|${x.id}`]); if (sin.length) warns.push(`Grafos: ${sin.length} aristas de ${f} (grafo de unidad) sin voz en voces_grafos: ${sin.map(x => x.id).join(', ')}.`); });
  }
  // grafos
  if (!S.refs) warns.push('Grafos: no se pudo leer grafos/data/refs_index.json; no se muestran ni validan los vínculos con los grafos.');
  else oks.push(`Grafos: índice con ${S.refs.length} nodos y aristas en ${new Set(S.refs.map(x => x.file)).size} grafos.`);
  if (!errs.length) oks.push('Sin errores de ids, sentidos, remisiones, niveles, voces, anclas, aristas ni referencias de FAQ.');
  return {errs, warns, oks, coh};
}
