// N1-U.6 · La ficha es la entrada; macro/unidad/subunidad son contexto y respaldo.
// Los vínculos son selección editorial explícita, no uniones automáticas ni nuevas aristas canónicas.
const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const fail = message => { throw new Error(`Puentes de fichas: ${message}`); };
const clean = x => typeof x === 'string' && !!x.trim();

export function construirPuentesExplicativos(modelo, fichas, recurso) {
  if (recurso?.schema !== 'agora.lab.n1u6.puentes.v1' || recurso.estado !== 'borrador_editorial_para_curaduria') fail('esquema o estado incorrectos');
  if (!modelo?.revision || recurso.fuente?.revision !== modelo.revision || fichas?.revision !== modelo.revision ||
      recurso.fuente?.fichas_schema !== 'agora.lab.n1u5.fichas.v1') fail('revisión o ficha fuente distintas');
  if (!Array.isArray(recurso.puentes) || recurso.puentes.length !== fichas.fichas.length) fail('falta un puente por ficha');
  const porFicha = new Map(), macroPorId = new Map(modelo.macros.map(m => [m.id, m]));
  for (const p of recurso.puentes) {
    const ficha = fichas.porId.get(p?.ficha_id);
    if (!ficha || porFicha.has(p.ficha_id)) fail('ficha ausente o duplicada');
    const macros = p.contextos?.macros, unidades = p.contextos?.unidades;
    if (!Array.isArray(macros) || !macros.length || !Array.isArray(unidades) || !unidades.length || !Array.isArray(p.apoyos) || !p.apoyos.length) fail('faltan contextos o apoyos');
    const vistos = new Set();
    for (const m of macros) {
      if (!macroPorId.has(m.id) || !clean(m.rol) || !clean(m.explicacion) || vistos.has(`m:${m.id}`)) fail(`macrounidad incorrecta de ${p.ficha_id}`);
      vistos.add(`m:${m.id}`);
    }
    for (const u of unidades) {
      if (!modelo.unidades.has(u.id) || !clean(u.rol) || !clean(u.explicacion) || vistos.has(`u:${u.id}`)) fail(`unidad incorrecta de ${p.ficha_id}`);
      if (!macros.some(m => macroPorId.get(m.id).unidades.some(x => x.id === u.id))) fail(`unidad sin macrounidad de contexto: ${u.id}`);
      vistos.add(`u:${u.id}`);
    }
    for (const a of p.apoyos) {
      const sub = modelo.subs.get(a.sub_id);
      if (!sub || !clean(a.rol) || !clean(a.explicacion) || vistos.has(`s:${a.sub_id}`)) fail(`apoyo textual incorrecto: ${a.sub_id}`);
      if (!unidades.some(u => u.id === sub.unidad)) fail(`apoyo sin unidad contextual seleccionada: ${a.sub_id}`);
      vistos.add(`s:${a.sub_id}`);
    }
    if (ficha.tipo === 'faq') {
      // Para las FAQ piloto, reutilizamos SOLO los anclajes escogidos para el trayecto publicado.
      if (p.apoyos.length !== ficha.pasos.length || p.apoyos.some((a, i) => a.sub_id !== ficha.pasos[i].sub_id || a.paso_id !== ficha.pasos[i].id)) fail(`los anclajes de la FAQ ${p.ficha_id} no coinciden con el trayecto`);
    } else if (p.apoyos.some(a => a.paso_id || modelo.subs.get(a.sub_id).unidad !== 'proemio')) fail('el Proemio solo admite sus apoyos curatoriales');
    porFicha.set(p.ficha_id, Object.freeze({ ...p }));
  }
  return Object.freeze({ revision: modelo.revision, porFicha, fichas });
}

export function elementosPuentes(modelo, fichas, puentes, fichaId, vista, seleccion = {}) {
  if (!['orientacion', 'apoyos'].includes(vista)) fail('vista desconocida');
  if (modelo.revision !== puentes.revision || fichas.revision !== puentes.revision) fail('revisión distinta');
  const ficha = fichas.porId.get(fichaId), p = puentes.porFicha.get(fichaId);
  if (!ficha || !p) fail('ficha sin puentes');
  const ids = [], nodes = [{ group: 'nodes', data: { id: `puente:ficha:${fichaId}`, tipo: 'ficha_central', key: fichaId, label: ficha.titulo, seleccionado: seleccion.id === 'ficha' ? 1 : 0 }, position: { x: 130, y: 340 } }];
  const edges = [];
  const add = (kind, item, i, total, label, x) => {
    const id = `${kind}:${item.id || item.sub_id}`;
    const tipo = ({ macro: 'macro_referida', unidad: 'unidad_referida', sub: 'subunidad_referida' })[kind];
    nodes.push({ group: 'nodes', data: { id: `puente:${fichaId}:${id}`, tipo, key: id, label, seleccionado: seleccion.id === id ? 1 : 0 }, position: { x, y: 120 + i * (total > 4 ? 150 : 190) } });
    edges.push({ group: 'edges', data: { id: `puente-arista:${fichaId}:${id}`, key: id, source: `puente:ficha:${fichaId}`, target: `puente:${fichaId}:${id}`, tipo: kind === 'sub' ? 'respaldo_textual' : 'contexto_ficha', label: item.rol, seleccionado: seleccion.id === id ? 1 : 0 } });
    ids.push(id);
  };
  if (vista === 'orientacion') {
    const contexts = [...p.contextos.macros.map(m => ({ kind: 'macro', item: m })), ...p.contextos.unidades.map(u => ({ kind: 'unidad', item: u }))];
    contexts.forEach(({ kind, item }, i) => {
      const macro = kind === 'macro' ? modelo.macros.find(m => m.id === item.id) : null;
      const title = kind === 'macro' ? `${macro.capitulos} · ${macro.titulo}` : modelo.unidades.get(item.id).titulo;
      add(kind, item, i, contexts.length, `${title}\n${item.rol}`, kind === 'macro' ? 530 : 940);
    });
  } else {
    p.apoyos.forEach((a, i) => {
      const s = modelo.subs.get(a.sub_id);
      add('sub', a, i, p.apoyos.length, `${s.titulo}\n${a.sub_id}`, 650);
    });
  }
  return [...nodes, ...edges];
}

export function inspectorPuentesHtml(modelo, fichas, puentes, fichaId, vista, seleccionado = null) {
  const ficha = fichas.porId.get(fichaId), p = puentes.porFicha.get(fichaId);
  if (!ficha || !p) fail('no existe ficha');
  const source = vista === 'orientacion' ? [
    ...p.contextos.macros.map(x => ({ ...x, key: `macro:${x.id}`, tipo: 'Macrounidad propuesta', titulo: modelo.macros.find(m => m.id === x.id)?.titulo || x.id, ref: modelo.macros.find(m => m.id === x.id)?.capitulos })),
    ...p.contextos.unidades.map(x => ({ ...x, key: `unidad:${x.id}`, tipo: 'Unidad registrada', titulo: modelo.unidades.get(x.id)?.titulo || x.id, ref: x.id })),
  ] : p.apoyos.map(x => ({ ...x, key: `sub:${x.sub_id}`, tipo: 'Pasaje de apoyo', titulo: modelo.subs.get(x.sub_id)?.titulo || x.sub_id, ref: x.sub_id }));
  const active = source.find(x => x.key === seleccionado);
  const intro = vista === 'orientacion' ? 'Estos vínculos sitúan la ficha en el Libro I. Son asociaciones editoriales seleccionadas expresamente; no se derivan del árbol de subunidades.' : 'Los pasajes se vinculan directamente con la ficha según una decisión editorial. El lector puede verificar cada apoyo en griego y castellano. No se dibujan enlaces automáticos hacia su unidad.';
  const html = `<div class="arch-inspector-heading"><span class="arch-chip arch-chip--propuesto">Puentes explicativos · borrador</span></div>
    <h2>${safe(active?.titulo || ficha.titulo)}</h2>
    ${active ? `<p class="arch-muted">${safe(active.tipo)} · ${safe(active.ref)}</p><h3>Función en esta ficha</h3><p><strong>${safe(active.rol)}</strong>. ${safe(active.explicacion)}</p>
      ${active.sub_id ? `<button class="arch-primary" type="button" data-arch-read="${safe(active.sub_id)}">Leer el pasaje bilingüe</button>` : ''}
      ${active.paso_id ? `<button class="arch-minor" type="button" data-arch-guide-step="${safe(active.paso_id)}">Volver al paso explicativo</button>` : ''}
      ${active.key.startsWith('unidad:') ? `<button class="arch-minor" type="button" data-arch-go-unit="${safe(active.id)}">Explorar la unidad en el archivo estructural</button>` : ''}` : `<p>${safe(intro)}</p>`}
    <h3>${vista === 'orientacion' ? 'Ubicaciones relevantes' : 'Evidencias seleccionadas'} (${source.length})</h3>
    <div class="arch-nav-list">${source.map(x => `<button type="button" data-arch-bridge="${safe(x.key)}"><strong>${safe(x.titulo)}</strong><small>${safe(x.rol)} · ${safe(x.ref)}</small></button>`).join('')}</div>
    <p class="arch-muted">${vista === 'orientacion' ? 'La inclusión de una unidad en una macrounidad es un hecho estructural separado del sentido explicativo del puente.' : 'El enlace no afirma una deducción: identifica un pasaje que fundamenta, matiza o plantea el problema de esta ficha.'}</p>`;
  return html;
}
