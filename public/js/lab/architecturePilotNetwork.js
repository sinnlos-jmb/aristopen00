// Ágora · N1-U.7 · Cuatro fichas de síntesis y red curatorial de siete fichas.
// Extiende N1-U.5/N1-U.6 sin modificar FAQ, trayectos, tagueo ni MariaDB.
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);
const fail = msg => { throw new Error(`Red de fichas N1-U.7: ${msg}`); };
const txt = v => typeof v === 'string' && !!v.trim();
const NUEVAS = ['faq.lab.felicidad','faq.lab.ergon','faq.lab.alma','faq.lab.virtudes'];
const EXISTENTES = ['proemio','faq.etica.intro','faq.agathon.pros_hen'];

export function construirAmpliacionFichas(modelo, fichasBase, puentesBase, recurso) {
  if (recurso?.schema !== 'agora.lab.n1u7.fichas-red.v1' || recurso?.estado !== 'borrador_pedagogico_pendiente_curaduria') fail('schema o estado inesperado');
  if (!modelo?.revision || modelo.revision !== fichasBase?.revision || modelo.revision !== puentesBase?.revision ||
      modelo.revision !== recurso.fuente?.revision || recurso.fuente?.fichas_previas !== 'agora.lab.n1u5.fichas.v1' ||
      recurso.fuente?.puentes_previos !== 'agora.lab.n1u6.puentes.v1') fail('revisión/antecedente no coincidente');
  if (fichasBase.fichas.length !== 3 || puentesBase.porFicha.size !== 3 ||
      !EXISTENTES.every(id => fichasBase.porId.has(id) && puentesBase.porFicha.has(id))) fail('faltan fichas de partida');
  if (!Array.isArray(recurso.fichas) || recurso.fichas.length !== 4) fail('se esperaban cuatro fichas nuevas');
  const porId = new Map(fichasBase.porId), puentesPorFicha = new Map(puentesBase.porFicha);
  const macros = new Map(modelo.macros.map(m => [m.id, m]));
  for (const f of recurso.fichas) {
    if (!NUEVAS.includes(f?.id) || porId.has(f.id) || f.tipo !== 'faq' || !txt(f.titulo) ||
        f.fuente_editorial?.faq_id !== f.id || f.fuente_editorial?.origen !== 'propuesta_lab' ||
        f.fuente_editorial?.estado !== 'borrador_no_publicado' || f.fuente_editorial?.trayecto_id !== null ||
        f.fuente_editorial?.pasos_propuestos !== 6) fail('identidad de ficha/FAQ borrador incorrecta');
    for (const field of ['introduccion','lectura_grafo','referencias']) {
      if (!Array.isArray(f[field]) || !f[field].length || !f[field].every(txt)) fail(`campo explicativo inválido: ${field}`);
    }
    if (!txt(f.nota) || !Array.isArray(f.pasos) || f.pasos.length !== 6 || !Array.isArray(f.transiciones) ||
        f.transiciones.length !== 5 || !f.transiciones.every(txt)) fail('trayecto de seis pasos incompleto');
    const subs = new Set();
    for (const [i,p] of f.pasos.entries()) {
      if (p?.id !== `p${i+1}` || !txt(p.titulo) || !txt(p.comentario) || !modelo.subs.has(p.sub_id) || subs.has(p.sub_id))
        fail(`paso o pasaje inválido: ${f.id}/${p?.id}`);
      subs.add(p.sub_id);
    }
    const c = f.contextos;
    if (!Array.isArray(c?.macros) || !c.macros.length || !Array.isArray(c?.unidades) || !c.unidades.length ||
        !Array.isArray(f.apoyos) || f.apoyos.length !== 6) fail('puentes incompletos');
    const macroIds = new Set(), unidadIds = new Set(), apoyoIds = new Set();
    for (const m of c.macros) {
      if (!macros.has(m.id) || macroIds.has(m.id) || !txt(m.rol) || !txt(m.explicacion)) fail(`macrounidad inválida: ${f.id}`);
      macroIds.add(m.id);
    }
    for (const u of c.unidades) {
      if (!modelo.unidades.has(u.id) || unidadIds.has(u.id) || !txt(u.rol) || !txt(u.explicacion) ||
          !c.macros.some(m => macros.get(m.id).unidades.some(x => x.id === u.id))) fail(`unidad de contexto inválida: ${f.id}/${u.id}`);
      unidadIds.add(u.id);
    }
    for (const [i,a] of f.apoyos.entries()) {
      const paso=f.pasos[i], sub=modelo.subs.get(a?.sub_id);
      if (!sub || apoyoIds.has(a.sub_id) || a.paso_id !== paso.id || a.sub_id !== paso.sub_id ||
          !unidadIds.has(sub.unidad) || !txt(a.rol) || !txt(a.explicacion)) fail(`pasaje de apoyo sin anclaje explícito: ${f.id}/${a?.sub_id}`);
      apoyoIds.add(a.sub_id);
    }
    const related = f.fuente_editorial?.faqs_canonicas_relacionadas;
    if (!Array.isArray(related) || !related.every(txt)) fail('lista editorial de FAQ relacionadas inválida');
    porId.set(f.id, Object.freeze(f));
    puentesPorFicha.set(f.id, Object.freeze({ ficha_id:f.id, contextos:c, apoyos:f.apoyos }));
  }
  if (porId.size !== 7 || NUEVAS.some(id => !porId.has(id))) fail('red incompleta');
  const redes = recurso.red;
  if (redes?.estado !== 'relaciones_editoriales_propuestas' || !txt(redes.nota) || !Array.isArray(redes.relaciones) || !redes.relaciones.length) fail('red ausente');
  const enlacesPorId = new Map(), pares = new Set();
  for (const r of redes.relaciones) {
    const par = `${r.desde}->${r.hacia}`;
    if (!txt(r.id) || enlacesPorId.has(r.id) || pares.has(par) || r.desde === r.hacia ||
        !porId.has(r.desde) || !porId.has(r.hacia) || !txt(r.nombre) || !txt(r.explicacion)) fail('arista editorial inválida o duplicada');
    enlacesPorId.set(r.id, Object.freeze(r)); pares.add(par);
  }
  const fichas = Object.freeze({ revision: modelo.revision, porId, fichas: Object.freeze([...porId.values()]) });
  const puentes = Object.freeze({ revision: modelo.revision, porFicha: puentesPorFicha, fichas });
  const red = Object.freeze({ revision: modelo.revision, relaciones: redes.relaciones, porId: enlacesPorId, nota: redes.nota });
  return Object.freeze({ fichas, puentes, red });
}

export function elementosRedFichas(fichas, red, seleccion = {}) {
  if (fichas.revision !== red.revision) fail('revisión de la red incompatible');
  // Disposición orientativa reconstruida de la captura aportada por el editor (N1-U.10).
  // Las coordenadas exactas originales no se conocen; una vez ajustado el grafo se pueden guardar.
  const posiciones = [
    [828,110],   // ¿Qué es la ética? (arriba, centro)
    [598,394],   // Proemio (segundo nivel, izquierda)
    [1103,371],  // Cómo se dice el bien (segundo nivel, derecha)
    [828,674],   // Felicidad (centro)
    [1285,949],  // Érgon (abajo, derecha)
    [821,1220],  // Partes del alma (base)
    [378,952],   // Tipos de virtudes (abajo, izquierda)
  ];
  const ids = ['faq.etica.intro','proemio','faq.agathon.pros_hen',
    'faq.lab.felicidad','faq.lab.ergon','faq.lab.alma','faq.lab.virtudes'];
  const nodes = ids.map((id,i) => {
    const f = fichas.porId.get(id); if (!f) fail(`ficha ausente: ${id}`);
    const titulo = f.titulo.replace(/^¿/, '').replace(/\?$/, '');
    return { group:'nodes', data:{id:`red:ficha:${id}`,tipo:'ficha_red',key:id,label:titulo,
      seleccionado:seleccion.fichaId===id ? 1:0,procedencia:id.startsWith('faq.lab.')?'propuesta_lab':'piloto_anterior'},
      position:{x:posiciones[i][0],y:posiciones[i][1]} };
  });
  const edges = red.relaciones.map(r => ({group:'edges',data:{id:`red:enlace:${r.id}`,tipo:'relacion_entre_fichas',key:r.id,
    source:`red:ficha:${r.desde}`,target:`red:ficha:${r.hacia}`,label:r.nombre,seleccionado:seleccion.enlaceId===r.id?1:0}}));
  return [...nodes,...edges];
}

export function inspectorRedFichasHtml(fichas, red, fichaId=null, enlaceId=null) {
  if (fichas.revision !== red.revision) fail('revisión distinta');
  const f = fichas.porId.get(fichaId), r = red.porId.get(enlaceId);
  const nav = `<div class="arch-nav-list">${fichas.fichas.map(x=>`<button type="button" data-arch-card="${html(x.id)}">${html(x.titulo)}<small>${x.id.startsWith('faq.lab.')?'FAQ de síntesis · borrador':'Ficha piloto existente'}</small></button>`).join('')}</div>`;
  if (r) return `<div class="arch-inspector-heading"><span class="arch-chip arch-chip--propuesto">Relación propuesta</span></div>
    <h2>${html(r.nombre)}</h2><p>${html(fichas.porId.get(r.desde).titulo)} → ${html(fichas.porId.get(r.hacia).titulo)}</p>
    <h3>Fundamento editorial</h3><p>${html(r.explicacion)}</p>
    <button class="arch-primary" type="button" data-arch-card="${html(r.hacia)}">Abrir ficha de destino</button>
    <button class="arch-minor" type="button" data-arch-card="${html(r.desde)}">Abrir ficha de origen</button>
    <button class="arch-minor" type="button" data-arch-red-list>Ver todas las fichas</button>`;
  if (f) return `<div class="arch-inspector-heading"><span class="arch-chip">Ficha filosófica</span></div><h2>${html(f.titulo)}</h2>
    <p>${html(f.introduccion[0])}</p><button class="arch-primary" type="button" data-arch-card="${html(f.id)}">Abrir explicación y diagrama</button>
    <h3>Relaciones seleccionadas</h3><div class="arch-nav-list">${red.relaciones.filter(x=>x.desde===f.id||x.hacia===f.id).map(x=>`<button type="button" data-arch-red-link="${html(x.id)}">${html(x.nombre)}<small>${html(fichas.porId.get(x.desde===f.id?x.hacia:x.desde).titulo)}</small></button>`).join('')}</div>`;
  return `<div class="arch-inspector-heading"><span class="arch-chip arch-chip--propuesto">Grafo de orientación · propuesta editorial</span></div>
    <h2>Siete puertas de entrada al Libro I</h2><p>${html(red.nota)}</p><p>Seleccioná una ficha o una flecha para examinarla y entrar en su explicación.</p>${nav}`;
}
