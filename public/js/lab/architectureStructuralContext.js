// N1-U.11 · Grafo de respaldo de una ficha. SOLO nodos seleccionados en puentes editoriales.
// La inclusión de subunidad en unidad y de unidad en macrounidad es una relación
// documental distinta del vínculo explicativo de la ficha con su evidencia.
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[c]);
const fail = msg => { throw new Error(`Grafo de respaldo N1-U.11: ${msg}`); };

export function elementosContextoEstructural(modelo, fichas, puentes, fichaId, seleccion={}) {
  if (!modelo?.revision || modelo.revision !== fichas?.revision || modelo.revision !== puentes?.revision) fail('revisión editorial incompatible');
  const f = fichas.porId.get(fichaId), puente = puentes.porFicha.get(fichaId);
  if (!f || !puente) fail('ficha o puentes inexistentes');
  const macros = new Map(modelo.macros.map(m => [m.id,m]));
  const nodes = [{ group:'nodes', data:{ id:`puente:ficha:${fichaId}`, tipo:'ficha_central',key:'ficha',label:f.titulo }, position:{x:60,y:390} }];
  const edges = [], mIds = new Set(puente.contextos.macros.map(m => m.id));
  const uIds = new Set(puente.contextos.unidades.map(u => u.id));
  const mark = key => seleccion.id === key ? 1 : 0;
  puente.contextos.macros.forEach((item,i) => {
    const m = macros.get(item.id); if (!m) fail('macrounidad no registrada');
    const id=`puente:${fichaId}:macro:${item.id}`, key=`macro:${item.id}`;
    nodes.push({group:'nodes',data:{id,tipo:'macro_referida',key,label:`${m.capitulos} · ${m.titulo}`,seleccionado:mark(key)},position:{x:480,y:130+i*330}});
    edges.push({group:'edges',data:{id:`puente-arista:${fichaId}:macro:${item.id}`,tipo:'contexto_ficha',source:`puente:ficha:${fichaId}`,target:id,key,label:item.rol,seleccionado:mark(key)}});
  });
  puente.contextos.unidades.forEach((item,i) => {
    const unidad = modelo.unidades.get(item.id); if (!unidad) fail('unidad no registrada');
    const macro = [...macros.values()].find(m=>m.unidades.some(u=>u.id === item.id) && mIds.has(m.id));
    if (!macro) fail('unidad de contexto sin macrounidad editorial');
    const id=`puente:${fichaId}:unidad:${item.id}`,key=`unidad:${item.id}`;
    nodes.push({group:'nodes',data:{id,tipo:'unidad_referida',key,label:`${unidad.titulo}\n${item.rol}`,seleccionado:mark(key)},position:{x:850,y:80+i*175}});
    edges.push({group:'edges',data:{id:`puente-pertenece:${fichaId}:unidad:${item.id}`,tipo:'pertenencia_estructural',source:`puente:${fichaId}:macro:${macro.id}`,target:id,key,label:'contiene',seleccionado:mark(key)}});
  });
  const cuenta = new Map();
  puente.apoyos.forEach((item,i) => {
    const sub = modelo.subs.get(item.sub_id); if (!sub || !uIds.has(sub.unidad)) fail('pasaje fuera de unidad contextual seleccionada');
    const local=cuenta.get(sub.unidad)||0;cuenta.set(sub.unidad,local+1);
    const id=`puente:${fichaId}:sub:${item.sub_id}`,key=`sub:${item.sub_id}`;
    nodes.push({group:'nodes',data:{id,tipo:'subunidad_referida',key,label:`${sub.titulo}\n${item.sub_id}`,seleccionado:mark(key)},position:{x:1260,y:80+i*142}});
    edges.push({group:'edges',data:{id:`puente-pertenece:${fichaId}:sub:${item.sub_id}`,tipo:'pertenencia_estructural',source:`puente:${fichaId}:unidad:${sub.unidad}`,target:id,key,label:'pasaje',seleccionado:mark(key)}});
  });
  return [...nodes,...edges];
}

export function inspectorContextoEstructuralHtml(modelo, fichas, puentes, fichaId, seleccionado=null) {
  const f = fichas.porId.get(fichaId), p = puentes.porFicha.get(fichaId);
  if (!f || !p) fail('ficha sin puentes');
  const macro = p.contextos.macros.map(a => ({key:`macro:${a.id}`, ...a, tipo:'Macrounidad', titulo:modelo.macros.find(m=>m.id===a.id)?.titulo}));
  const unidad = p.contextos.unidades.map(a => ({key:`unidad:${a.id}`, ...a,tipo:'Unidad',titulo:modelo.unidades.get(a.id)?.titulo}));
  const apoyos = p.apoyos.map(a => ({key:`sub:${a.sub_id}`, ...a,tipo:'Pasaje',titulo:modelo.subs.get(a.sub_id)?.titulo}));
  const items=[...macro,...unidad,...apoyos], active=items.find(a=>a.key===seleccionado);
  return `<div class="arch-inspector-heading"><span class="arch-chip arch-chip--propuesto">Respaldo estructural · selección editorial</span></div>
    <h2>${safe(active?.titulo || f.titulo)}</h2>
    ${active ? `<p class="arch-muted">${safe(active.tipo)} · ${safe(active.id || active.sub_id)}</p><h3>Función en esta explicación</h3><p><strong>${safe(active.rol)}</strong>. ${safe(active.explicacion)}</p>
      ${active.sub_id ? `<button class="arch-primary" type="button" data-arch-read="${safe(active.sub_id)}">Leer pasaje bilingüe</button>${active.paso_id ? `<button class="arch-minor" type="button" data-arch-guide-step="${safe(active.paso_id)}">Ir al paso explicativo</button>` : ''}` : ''}
      ${active.tipo === 'Unidad' ? `<button class="arch-minor" type="button" data-arch-go-unit="${safe(active.id)}">Abrir unidad del archivo estructural</button>` : ''}` :
      `<p>El mapa presenta solo los contextos y pasajes <strong>seleccionados editorialmente</strong> para esta ficha. Las flechas entre macrounidades, unidades y subunidades indican pertenencia documental, <em>no</em> inferencias filosóficas.</p>`}
    <details class="arch-remisiones"><summary>Explorar apoyos y contexto (${items.length})</summary><div class="arch-nav-list">${items.map(x=>`<button type="button" data-arch-bridge="${safe(x.key)}">${safe(x.titulo)}<small>${safe(x.tipo)} · ${safe(x.rol)}</small></button>`).join('')}</div></details>
    <p class="arch-muted">Los anclajes provienen del corpus y de los puentes N1-U.6/7. No se han importado automáticamente otras subunidades ni relaciones entre conceptos.</p>`;
}
