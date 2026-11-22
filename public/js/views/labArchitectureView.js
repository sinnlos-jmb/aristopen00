// N1-U.2 · Arquitectura argumentativa. Experimento read-only sobre datos de MariaDB.
import { esc } from '../ui.js';
import { cargarCytoscape } from '../lab/cytoscapeLoader.js';
import { construirModeloArquitectura, obtenerContexto, elementosArquitectura } from '../lab/architectureModel.js';
import { construirRelacionesProemio, elementosRelacionesProemio } from '../lab/architectureRelations.js';
import { construirCapasProemio, elementosCapaBasica, elementosCapaDetallada } from '../lab/architectureLayers.js';
import { construirFichasArquitectura, elementosFichaFAQ, fichaIntroHtml, inspectorFichaFAQHtml } from '../lab/architectureCards.js';
import { construirPuentesExplicativos, elementosPuentes, inspectorPuentesHtml } from '../lab/architectureBridges.js';
import { construirAmpliacionFichas, elementosRedFichas, inspectorRedFichasHtml } from '../lab/architecturePilotNetwork.js';
import { ZOOM_SENSITIVITY_ACTUAL, opcionesModalFichasHtml } from '../lab/architectureUiControls.js';
import { conexionesFichaHtml } from '../lab/architectureFichaNavigation.js';
import { localizarSubunidadEnBiblioteca, representarLecturaContextual } from '../lab/graphPassageReader.js';
import { guiaExplicativaHtml } from '../lab/architectureTextGuide.js';
import { construirCatalogoExplicativo, composicionFaqHtml } from '../lab/architectureEditorialNetwork.js';
import { elementosContextoEstructural, inspectorContextoEstructuralHtml } from '../lab/architectureStructuralContext.js';
import { DEFAULT_DISPLAY, MONO_FONT, cargarDisplay, guardarDisplay, variarFuente, proyectarRamasEstructurales, hijosEstructurales } from '../lab/architectureDisplay.js';
import { LAYOUT_STORAGE_KEY, layoutParaGuardar, leerLayout, cargarLayoutLocal, guardarLayoutLocal, limpiarGrupo } from '../lab/architectureLayout.js';

const safe = x => esc(String(x ?? ''));
const text = x => x ? safe(x) : 'No consignado.';
const ref = s => Array.isArray(s) ? s.join('–') : String(s || 'Sin referencia');
const chip = (label, variant = 'registrado') => `<span class="arch-chip arch-chip--${variant}">${safe(label)}</span>`;
function remisionLabel(model, id) {
  const [clase, ...rest] = String(id || '').split(':');
  const target = rest.join(':');
  if (clase === 'sub') return model.subs.get(target)?.titulo || target;
  if (clase === 'unidad') return model.unidades.get(target)?.titulo || target;
  return id;
}
function renderRemisiones(model, remisiones, titulo = 'Remisiones editoriales') {
  if (!remisiones.length) return `<p class="arch-muted">Sin remisiones editoriales explícitas en este tramo.</p>`;
  return `<details class="arch-remisiones"><summary>${safe(titulo)} (${remisiones.length})</summary><ul>${remisiones.map(item => `
    <li>${item.sub ? `<strong>${safe(item.sub.titulo)} → </strong>` : ''}<strong>${safe(remisionLabel(model, item.destino.a))}</strong>
    <p>${safe(item.destino.t || 'Sin explicación editorial')}</p></li>`).join('')}</ul></details>`;
}

function inspectorHtml(model, state) {
  const ctx = obtenerContexto(model, state);
  if (ctx.subunidad) {
    const s = ctx.subunidad;
    const rels = Array.isArray(s.relaciones) ? s.relaciones : [];
    return `<div class="arch-inspector-heading">${chip('Registro de MariaDB')}</div>
      <h2>${safe(s.titulo)}</h2><p class="arch-muted">Subunidad · ${safe(ref(s.bekker))}</p>
      <h3>Contenido</h3><p>${text(s.intro)}</p>
      <h3>Función textual registrada</h3><p>${safe((s.movimientos || []).join(' · ') || 'Sin movimientos consignados')}</p>
      <h3>Relaciones conceptuales de esta subunidad</h3>
      ${rels.length ? `<ul class="arch-relations">${rels.map(r => `<li><strong>${safe(r.de)}</strong> — ${safe(r.rel)} → <strong>${safe(r.a)}</strong>
        ${r.voz ? chip(`Voz: ${r.voz}`) : ''}${r.cond ? `<p class="arch-muted">Condición: ${safe(r.cond)}</p>` : ''}</li>`).join('')}</ul>` : '<p class="arch-muted">Sin relaciones conceptuales registradas.</p>'}
      <p class="arch-muted">Estas relaciones tienen extremos conceptuales; no se dibujan como aristas entre subunidades.</p>
      <h3>Remisiones del mapa editorial</h3>${renderRemisiones(model, (s.mapa || []).map(destino => ({ destino })), 'Conexiones documentales registradas')}
      <button type="button" class="arch-primary" data-arch-read="${safe(s.id)}">Leer pasaje en griego y castellano</button>`;
  }
  if (ctx.momento) {
    const m = ctx.momento;
    return `<div class="arch-inspector-heading">${chip(m.origen === 'registrado' ? 'Articulación de MariaDB' : 'Propuesta editorial · no validada', m.origen)}</div>
      <h2>${safe(m.titulo)}</h2><p class="arch-muted">Momento ${safe(m.orden)} · ${safe(ctx.unidad.titulo)}</p>
      <h3>Función argumentativa</h3><p>${text(m.texto)}</p>
      <h3>Subunidades que comprende</h3>
      <div class="arch-nav-list">${m.subIds.map(id => { const s = model.subs.get(id); return `<button type="button" data-arch-kind="subunidad" data-arch-id="${safe(id)}">${safe(s?.titulo || id)} <small>${safe(ref(s?.bekker))}</small></button>`; }).join('')}</div>`;
  }
  if (ctx.unidad) {
    const u = ctx.unidad;
    const momentos = ctx.momentos;
    const registrado = momentos[0]?.origen === 'registrado';
    const remisiones = (u.subunidades || []).flatMap(sub => (sub.mapa || []).map(destino => ({ sub, destino })));
    return `<div class="arch-inspector-heading">${chip('Unidad de MariaDB')} ${chip(registrado ? 'Momentos registrados' : 'Momentos propuestos', registrado ? 'registrado' : 'propuesto')}</div>
      <h2>${safe(u.titulo)}</h2><p class="arch-muted">${safe(u.id)} · ${safe((u.tramos || []).map(ref).join(' · '))}</p>
      <h3>Resumen editorial existente</h3><p>${text(u.resumen)}</p>
      ${u.articulacion?.t ? `<h3>Articulación registrada</h3><p>${safe(u.articulacion.t)}</p>` : ''}
      <h3>Desarrollo en momentos</h3>
      <div class="arch-nav-list">${momentos.map(m => `<button type="button" data-arch-kind="momento" data-arch-id="${safe(m.id)}">${safe(m.orden)} · ${safe(m.titulo)} <small>${m.subIds.length} subunidades</small></button>`).join('')}</div>
      <p class="arch-muted">Los momentos ${registrado ? 'son datos editoriales registrados' : 'son hipótesis de organización del Lab, no incorporadas al tagueo'}.</p>
      <h3>Cómo se conectan sus pasajes</h3>
      <p class="arch-muted">Las remisiones de <code>mapa</code> documentan referencias entre pasajes, unidades y libros. No son todavía aristas filosóficas tipadas.</p>
      ${renderRemisiones(model, remisiones, 'Ver remisiones de sus subunidades')}`;
  }
  if (ctx.macro) {
    const m = ctx.macro;
    return `<div class="arch-inspector-heading">${chip('Macrounidad · propuesta editorial', 'propuesto')}</div>
      <h2>${safe(m.titulo)}</h2><p class="arch-muted">EN ${safe(m.capitulos)}</p>
      <h3>Problema</h3><p>${text(m.problema)}</p>
      <h3>Resultado propuesto</h3><p>${text(m.resultado)}</p>
      <h3>Unidades registradas</h3>
      <div class="arch-nav-list">${m.unidades.map(u => `<button type="button" data-arch-kind="unidad" data-arch-id="${safe(u.id)}">${safe(u.titulo)} <small>${(u.subunidades || []).length} subunidades</small></button>`).join('')}</div>`;
  }
  return `<div class="arch-inspector-heading">${chip('Mapa general · propuesta editorial', 'propuesto')}</div>
    <h2>Ética nicomáquea · Libro I</h2>
    <p>Esta arquitectura del Libro I organiza la lectura en cuatro macrounidades. No modifica la división en unidades y subunidades registrada en MariaDB.</p>
    <p>Las flechas del mapa general indican <strong>orden textual</strong>, no inferencias ni relaciones filosóficas acreditadas.</p>
    <h3>Elegí un bloque para explorarlo</h3>
    <div class="arch-nav-list">${model.macros.map(m => `<button type="button" data-arch-kind="macro" data-arch-id="${safe(m.id)}">${safe(m.capitulos)} · ${safe(m.titulo)} <small>${m.unidades.length} unidades</small></button>`).join('')}</div>
    <h3>Alcance</h3><p class="arch-muted">${model.stats.unidades} unidades · ${model.stats.subunidades} subunidades · ${model.stats.momentosRegistrados} momentos registrados · ${model.stats.momentosPropuestos} propuestos.</p>`;
}


// El modo argumentativo no reemplaza la ficha canónica: presenta hipótesis revisables.
function inspectorRelacionesHtml(model, grupo, relacionId, subId) {
  const sub = id => model.subs.get(id);
  const etiqueta = id => `${sub(id)?.titulo || id} · ${ref(sub(id)?.bekker)}`;
  const relaciones = grupo.relaciones;
  if (relacionId) {
    const r = grupo.porId.get(relacionId);
    if (r) return `<div class="arch-inspector-heading">${chip('Relación argumentativa · hipótesis', 'propuesto')}</div>
      <h2>${safe(r.nombre)}</h2><p class="arch-muted">Tipo editorial propuesto: ${safe(r.tipo)}</p>
      <h3>De · pasaje de origen</h3><p>${safe(etiqueta(r.de))}</p>
      <button type="button" class="arch-minor" data-arch-read="${safe(r.de)}">Leer origen en griego y castellano</button>
      <h3>A · pasaje de destino</h3><p>${safe(etiqueta(r.a))}</p>
      <button type="button" class="arch-minor" data-arch-read="${safe(r.a)}">Leer destino en griego y castellano</button>
      <h3>Fundamento editorial para discutir</h3><p>${safe(r.fundamento)}</p>
      <p class="arch-muted">Arista propuesta y dirigida. No registrada en MariaDB ni inferida automáticamente de una coincidencia conceptual.</p>
      <button type="button" class="arch-minor" data-arch-rel-list>Volver a las 10 propuestas</button>`;
  }
  if (subId && grupo.subIds.includes(subId)) {
    const s = sub(subId);
    const conectadas = relaciones.filter(r => r.de === subId || r.a === subId);
    return `<div class="arch-inspector-heading">${chip('Subunidad registrada')} ${chip('Relaciones hipotéticas', 'propuesto')}</div>
      <h2>${safe(s.titulo)}</h2><p class="arch-muted">${safe(ref(s.bekker))}</p>
      <h3>Contenido de MariaDB</h3><p>${text(s.intro)}</p>
      <button type="button" class="arch-minor" data-arch-read="${safe(subId)}">Leer pasaje bilingüe</button>
      <h3>Propuestas incidentes (${conectadas.length})</h3>
      ${conectadas.length ? `<div class="arch-nav-list">${conectadas.map(r => `<button type="button" data-arch-rel-select="${safe(r.id)}">${safe(r.de === subId ? 'Sale hacia' : 'Llega desde')}: ${safe(r.nombre)}<small>${safe(etiqueta(r.de === subId ? r.a : r.de))}</small></button>`).join('')}</div>` : '<p class="arch-muted">Todavía no se propuso una arista para esta subunidad. Esto no significa que carezca de función en el argumento.</p>'}
      <button type="button" class="arch-minor" data-arch-rel-list>Ver todas las propuestas</button>`;
  }
  return `<div class="arch-inspector-heading">${chip('N1-U.3 · hipótesis editoriales', 'propuesto')}</div>
    <h2>Relaciones argumentativas del Proemio</h2>
    <p>${relaciones.length} relaciones dirigidas, propuestas entre las ${grupo.subIds.length} subunidades registradas. Seleccioná una flecha o una subunidad del grafo.</p>
    <p class="arch-muted">${safe(grupo.nota)} Las justificaciones son hipótesis para comprobar mediante lectura; no son datos registrados ni conclusiones validadas.</p>
    <h3>Aristas para revisar</h3><div class="arch-nav-list">${relaciones.map(r => `<button type="button" data-arch-rel-select="${safe(r.id)}">${safe(r.nombre)}<small>${safe(ref(sub(r.de)?.bekker))} → ${safe(ref(sub(r.a)?.bekker))}</small></button>`).join('')}</div>`;
}

// N1-U.4: inspector de la resolución sintética, con trazabilidad a N1-U.3.
function inspectorModulosHtml(model, capas, moduloId, enlaceId) {
  const modulo = capas.porId.get(moduloId);
  const enlace = capas.enlaces.find(e => e.id === enlaceId);
  if (enlace) {
    const from = capas.porId.get(enlace.de), to = capas.porId.get(enlace.a);
    const relations = enlace.relacionIds.map(id => capas.detalle.porId.get(id));
    return `<div class="arch-inspector-heading">${chip('Capa 1 · proyección no validada', 'propuesto')}</div>
      <h2>${safe(enlace.nombre)}</h2><p class="arch-muted">${safe(from.titulo)} → ${safe(to.titulo)}</p>
      <h3>Relaciones de la capa detallada que la sustentan</h3>
      <div class="arch-nav-list">${relations.map(r => `<button type="button" data-arch-detail-rel="${safe(r.id)}">${safe(r.nombre)}<small>${safe(r.de)} → ${safe(r.a)} · ${safe(r.tipo)}</small></button>`).join('')}</div>
      <p class="arch-muted">Esta flecha resulta de proyectar las aristas propuestas de N1-U.3; no es una deducción ni una nueva relación canónica.</p>
      <button type="button" class="arch-minor" data-arch-mod-list>Volver a los módulos</button>`;
  }
  if (modulo) {
    const internas = capas.internas.get(modulo.id) || [];
    const vecinas = capas.enlaces.filter(e => e.de === modulo.id || e.a === modulo.id);
    return `<div class="arch-inspector-heading">${chip('Capa 1 · módulo propuesto', 'propuesto')}</div>
      <h2>${safe(modulo.id)} · ${safe(modulo.titulo)}</h2>
      <h3>Función en el razonamiento</h3><p>${safe(modulo.funcion)}</p>
      <p class="arch-muted">${modulo.subIds.length} subunidades · ${internas.length} relaciones internas · ${vecinas.length} enlaces externos</p>
      <button type="button" class="arch-primary" data-arch-detail-module="${safe(modulo.id)}">Abrir capa 2: examinar subunidades</button>
      <h3>Subunidades incluidas</h3><div class="arch-nav-list">${modulo.subIds.map(id => { const sub = model.subs.get(id); return `<button type="button" data-arch-detail-sub="${safe(id)}">${safe(sub?.titulo || id)}<small>${safe(ref(sub?.bekker))}</small></button>`; }).join('')}</div>
      <h3>Relaciones entre módulos</h3>${vecinas.length ? `<div class="arch-nav-list">${vecinas.map(e => `<button type="button" data-arch-link-select="${safe(e.id)}">${safe(e.nombre)}<small>${safe(capas.porId.get(e.de).titulo)} → ${safe(capas.porId.get(e.a).titulo)}</small></button>`).join('')}</div>` : '<p class="arch-muted">Sin enlaces externos propuestos.</p>'}
      <button type="button" class="arch-minor" data-arch-mod-list>Ver los cuatro módulos</button>`;
  }
  return `<div class="arch-inspector-heading">${chip('N1-U.4 · hipótesis editorial', 'propuesto')}</div>
    <h2>Proemio · capa básica</h2>
    <p>Cuatro módulos funcionales que agrupan las doce subunidades del Proemio. Los ${capas.enlaces.length} enlaces entre módulos se derivan únicamente de las diez aristas propuestas en N1-U.3.</p>
    <h3>Módulos para explorar</h3><div class="arch-nav-list">${capas.modulos.map(m => `<button type="button" data-arch-mod-select="${safe(m.id)}">${safe(m.id)} · ${safe(m.titulo)}<small>${m.subIds.length} subunidades · ${capas.internas.get(m.id).length} relaciones internas</small></button>`).join('')}</div>
    <h3>Enlaces fundamentados</h3><div class="arch-nav-list">${capas.enlaces.map(e => `<button type="button" data-arch-link-select="${safe(e.id)}">${safe(e.nombre)}<small>${safe(e.de)} → ${safe(e.a)} · relación propuesta N1-U.3</small></button>`).join('')}</div>
    <p class="arch-muted">Cambiar de capa no crea nuevas afirmaciones filosóficas: despliega o contrae el mismo conjunto de relaciones, todavía pendiente de validación textual.</p>`;
}

function graphStyle(display = DEFAULT_DISPLAY) {
  return [
    { selector: 'node', style: {
      'label': 'data(label)', 'text-wrap': 'wrap', 'text-max-width': '204px', 'text-valign': 'center',
      'text-halign': 'center', 'font-size': 14, 'font-family': 'system-ui, sans-serif',
      'color': '#142538', 'background-color': '#edf2f4', 'border-width': 2,
      'border-color': '#8ea5b0', 'shape': 'round-rectangle', 'width': 238, 'height': 78,
      'padding': 12, 'text-events': 'yes', 'overlay-opacity': 0,
    } },
    { selector: 'node[tipo = "macro"]', style: { 'background-color': '#dbe9e9', 'border-color': '#4c817f', 'font-weight': 650 } },
    { selector: 'node[tipo = "unidad"]', style: { 'background-color': '#e5ebff', 'border-color': '#627bb2', 'width': 232 } },
    { selector: 'node[tipo = "momento"]', style: { 'background-color': '#f6eedb', 'border-color': '#b08f46', 'width': 242, 'height': 76 } },
    { selector: 'node[tipo = "subunidad"]', style: { 'background-color': '#f4f0ff', 'border-color': '#9c85b6', 'width': 230, 'height': 78, 'font-size': 12 } },
    { selector: 'node[tipo = "ficha_red"]', style: { 'background-color': '#dcece8', 'border-color': '#447d76', 'width': 270, 'height': 114, 'font-size': 13, 'font-weight': 650 } },
    { selector: 'node[tipo = "ficha_red"][procedencia = "propuesta_lab"]', style: { 'border-style': 'dashed', 'border-color': '#6a9d95' } },
    { selector: 'node[tipo = "ficha_red"][seleccionado = 1]', style: { 'border-width': 5, 'border-color': '#265c56' } },
    { selector: 'node[tipo = "ficha_central"]', style: { 'background-color': '#d6eae7', 'border-color': '#31736c', 'width': 330, 'height': 112, 'font-size': 16, 'font-weight': 700 } },
    { selector: 'node[tipo = "macro_referida"]', style: { 'background-color': '#e7ecee', 'border-color': '#7d9a9b', 'width': 285, 'height': 100, 'font-size': 12 } },
    { selector: 'node[tipo = "unidad_referida"]', style: { 'background-color': '#ebeffa', 'border-color': '#8295ba', 'width': 285, 'height': 100, 'font-size': 12 } },
    { selector: 'node[tipo = "subunidad_referida"]', style: { 'background-color': '#f4f1e9', 'border-color': '#a69066', 'width': 300, 'height': 94, 'font-size': 12 } },
    { selector: 'node[tipo = "paso_faq"]', style: { 'background-color': '#edf0fa', 'border-color': '#627ca0', 'width': 330, 'height': 106, 'font-size': 13, 'font-weight': 550 } },
    { selector: 'node[tipo = "modulo_argumentativo"]', style: { 'background-color': '#e4f1f0', 'border-color': '#52837e', 'width': 310, 'height': 102, 'font-weight': 650, 'font-size': 16 } },
    { selector: 'node[tipo = "modulo_contenedor"]', style: { 'background-color': '#cde6e1', 'background-opacity': 0.19, 'border-color': '#69958e', 'border-style': 'dashed', 'border-width': 2, 'text-valign': 'top', 'text-margin-y': -14, 'font-size': 19, 'font-weight': 700, 'color': '#255e58', 'padding': 50, 'shape': 'round-rectangle', 'text-max-width': '340px', 'width': 'label', 'height': 'label' } },
    { selector: 'node[origen = "propuesto"]', style: { 'border-style': 'dashed' } },
    { selector: 'node[seleccionado = 1]', style: { 'border-width': 5, 'border-color': '#255e76' } },
    { selector: 'edge', style: {
      'curve-style': 'bezier', 'width': 2.5, 'line-color': '#8c9da5',
      'target-arrow-shape': 'triangle', 'target-arrow-color': '#8c9da5', 'arrow-scale': 1.2,
      'label': 'data(label)', 'font-size': 11, 'color': '#52626d',
      'text-background-color': '#ffffff', 'text-background-opacity': 0.87,
      'text-background-padding': 3, 'text-rotation': 'autorotate',
    } },
    { selector: 'edge[tipo = "orden_textual"]', style: { 'line-style': 'dashed', 'line-color': '#aaa', 'target-arrow-color': '#aaa' } },
    { selector: 'edge[tipo = "articula"]', style: { 'line-style': 'dashed', 'line-color': '#b99d54', 'target-arrow-color': '#b99d54' } },
    { selector: 'edge[tipo = "argumentativa_propuesta"]', style: { 'width': 3, 'line-style': 'dashed', 'line-color': '#bc7548', 'target-arrow-color': '#bc7548', 'font-size': 12, 'text-rotation': 'none' } },
    { selector: 'edge[tipo = "relacion_entre_fichas"]', style: { 'width': 2.5, 'line-style': 'dashed', 'line-color': '#5e8682', 'target-arrow-color': '#5e8682', 'font-size': 10, 'text-rotation': 'none' } },
    { selector: 'edge[tipo = "relacion_entre_fichas"][seleccionado = 1]', style: { 'width': 5, 'line-color': '#255f59', 'target-arrow-color': '#255f59' } },
    { selector: 'edge[tipo = "contexto_ficha"]', style: { 'width': 2.5, 'line-style': 'dashed', 'line-color': '#6c9692', 'target-arrow-color': '#6c9692', 'font-size': 10, 'text-rotation': 'none' } },
    { selector: 'edge[tipo = "pertenencia_estructural"]', style: { 'width': 1.8, 'line-style': 'dotted', 'line-color': '#adb6bb', 'target-arrow-color': '#adb6bb', 'font-size': 9, 'text-rotation': 'none' } },
    { selector: 'edge[tipo = "respaldo_textual"]', style: { 'width': 2.5, 'line-style': 'solid', 'line-color': '#94774b', 'target-arrow-color': '#94774b', 'font-size': 11, 'text-rotation': 'none' } },
    { selector: 'edge[tipo = "contexto_ficha"][seleccionado = 1], edge[tipo = "respaldo_textual"][seleccionado = 1]', style: { 'width': 5, 'line-color': '#27655e', 'target-arrow-color': '#27655e' } },
    { selector: 'edge[tipo = "orden_trayecto"]', style: { 'width': 3, 'line-style': 'dotted', 'line-color': '#707f9e', 'target-arrow-color': '#707f9e', 'font-size': 11 } },
    { selector: 'edge[tipo = "orden_trayecto"][seleccionado = 1]', style: { 'width': 5, 'line-color': '#294e83', 'target-arrow-color': '#294e83' } },
    { selector: 'edge[tipo = "argumentativa_resumida"]', style: { 'width': 4, 'line-style': 'dashed', 'line-color': '#417e78', 'target-arrow-color': '#417e78', 'font-size': 14, 'text-rotation': 'none' } },
    { selector: 'edge[tipo = "argumentativa_resumida"][seleccionado = 1]', style: { 'width': 7, 'line-color': '#20544e', 'target-arrow-color': '#20544e' } },
    { selector: 'edge[tipo = "argumentativa_propuesta"][seleccionado = 1]', style: { 'width': 6, 'line-color': '#a24d20', 'target-arrow-color': '#a24d20' } },
    // Preferencia del usuario: última regla sobreescribe todas las fuentes de las subclases.
    { selector:'node', style:{ 'font-family':MONO_FONT, 'font-size':display.graphFont, 'text-max-width':'250px', 'text-wrap':'wrap' } },
    { selector:'edge', style:{ 'font-family':MONO_FONT, 'font-size':Math.max(11,display.graphFont-3), 'label':display.showEdgeNames ? 'data(label)' : '' } },
    { selector:'node[colapsado = 1]', style:{ 'border-style':'dashed', 'border-width':4, 'border-color':'#2c6e6a' } },
  ];
}

export async function createLabArchitectureView(App) {
  const el = document.createElement('div');
  el.className = 'lab-architecture scrollable has-scroll';
  // El CSS se instala solo al abrir el experimento.
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = '/css/lab-arquitectura-n1u2.css'; css.dataset.agoraLabArquitectura = '1';
  document.head.append(css);
  const displayCss = document.createElement('link');
  displayCss.rel = 'stylesheet'; displayCss.href = '/css/lab-arquitectura-n1u12.css'; displayCss.dataset.agoraLabArquitectura = '1';
  document.head.append(displayCss);
  el.innerHTML = `<div class="arch-page">
    <nav class="arch-top"><a href="#/lab">← Volver al Lab</a><span>N1-U.12 · Fichas, grafos y lectura · Solo consulta</span></nav>
    <h1>Fichas explicativas del Libro I</h1>
    <p class="arch-intro">Comenzá por una red de preguntas filosóficas y explorá los pasajes que fundamentan cada explicación. La virtud completa en una vida entera.</p>
    <p class="arch-status" role="status" aria-live="polite">Cargando la revisión editorial…</p>
    <div class="arch-main" hidden>
      <div class="arch-fichas-nav" role="group" aria-label="Navegación por fichas">
        <button type="button" data-arch-picker-open aria-haspopup="dialog">Elegir ficha…</button>
        <span class="arch-ficha-actual" data-arch-current-ficha aria-live="polite">Vista general · siete fichas</span>
        <button type="button" data-arch-previous hidden aria-label="Volver a la ficha anterior">← Anterior</button>
        <button type="button" data-arch-network aria-pressed="true">Red de fichas</button>
      </div>
      <dialog class="arch-picker-dialog" aria-labelledby="arch-picker-title">
        <div class="arch-picker-body">
          <header class="arch-picker-head">
            <div><h2 id="arch-picker-title">Elegir una ficha</h2><p>Preguntas del Libro I · seleccioná una para explorarla.</p></div>
            <button type="button" class="arch-picker-close" data-arch-picker-close aria-label="Cerrar selector de fichas">Cerrar ✕</button>
          </header>
          <div class="arch-picker-options" role="group" aria-label="Siete fichas disponibles"></div>
        </div>
      </dialog>
      <section class="arch-ficha-panel" aria-label="Marco explicativo del diagrama" hidden></section>
      <div class="arch-perspectivas" role="group" aria-label="Enfoque de la ficha" hidden>
        <button type="button" data-arch-perspectiva="orientacion" aria-pressed="true">1 · Respaldo estructural</button>
        <button type="button" data-arch-perspectiva="diagrama" aria-pressed="false">2 · Diagrama explicativo</button>
        <button type="button" data-arch-perspectiva="apoyos" aria-pressed="false">3 · Pasajes de apoyo</button>
      </div>
      <div class="arch-toolbar">
        <button type="button" data-arch-legacy>Archivo estructural del Libro I</button>
        <button type="button" data-arch-back="libro" hidden>Libro I</button>
        <button type="button" data-arch-back="macro" hidden>Volver a macrounidad</button>
        <button type="button" data-arch-back="unidad" hidden>Volver a unidad</button>
        <button type="button" data-arch-back="momento" hidden>Volver a momento</button>
        <div class="arch-modes" role="group" aria-label="Vista del argumento" hidden>
          <button type="button" data-arch-mode="modulos" aria-pressed="true">Vista sintética · módulos</button>
          <button type="button" data-arch-mode="relaciones" aria-pressed="false">Vista analítica · relaciones</button>
        </div>
        <button type="button" data-arch-fit>Ajustar grafo</button>
        <span class="arch-display-tools" role="group" aria-label="Tamaño de textos del grafo">
          <label>Grafo</label><button type="button" data-arch-graph-font="-2" aria-label="Reducir letra del grafo">A−</button>
          <output data-arch-graph-font-value aria-live="polite">17 px</output>
          <button type="button" data-arch-graph-font="2" aria-label="Aumentar letra del grafo">A+</button>
          <button type="button" data-arch-edge-labels aria-pressed="true" title="Mostrar u ocultar los nombres de las aristas">Aristas: nombres</button>
        </span>
        <button type="button" data-arch-toggle-branch hidden title="Alternativa al doble clic para teclado y accesibilidad">Contraer rama</button>
        <span class="arch-gestos" data-arch-gestos hidden>1 clic: inspeccionar · 2 clics: expandir/contraer</span>
        <button type="button" data-arch-layout-save title="Guardar posiciones de este grafo en este navegador">Guardar disposición</button>
        <details class="arch-layout-tools"><summary>Diseño</summary>
          <button type="button" data-arch-layout-reset>Restaurar disposición inicial</button>
          <button type="button" data-arch-layout-export>Exportar JSON</button>
          <button type="button" data-arch-layout-import-open>Importar JSON</button>
          <input type="file" accept=".json,application/json" data-arch-layout-import hidden>
        </details>
        <span class="arch-layout-status" data-arch-layout-status role="status" aria-live="polite"></span>
        <details class="arch-legend-details"><summary>Convenciones del grafo</summary><span class="arch-legend" data-arch-legend>Los vínculos desde la ficha son decisiones editoriales revisables, no aristas extraídas automáticamente del tagueo.</span></details>
      </div>
      <div class="arch-columns">
        <section class="arch-graph-shell" aria-label="Grafo del libro">
          <div class="arch-graph" role="img" aria-label="Grafo de macrounidades, unidades, momentos y subunidades"></div>
          <div class="arch-graph-fallback" hidden>El grafo requiere Cytoscape. Podés seguir navegando desde el inspector.</div>
        </section>
        <aside class="arch-inspector" aria-label="Ficha editorial"><div class="arch-inspector-content"></div></aside>
      </div>
      <details class="arch-footer"><summary>Fuentes y estado editorial</summary><p>N1-U.7 reúne siete fichas y propone una primera red curatorial navegable. Las cuatro nuevas FAQ y sus seis pasos son borradores, no trayectos publicados. Cada ficha separa contexto, diagrama y apoyo textual. El archivo estructural sigue disponible como herramienta documental; los puentes explicativos y las aristas argumentativas hipotéticas no sustituyen ni modifican MariaDB.</p></details>
    </div>
    <section class="arch-reader" hidden>
      <div class="arch-reader-head"><button type="button" data-arch-reader-back>← Volver al grafo</button><div><h2 data-arch-reader-title>Lectura</h2><p class="arch-muted" data-arch-reader-ref></p></div>
        <span class="arch-reader-font-tools" role="group" aria-label="Tamaño del texto bilingüe"><label>Texto bilingüe</label>
          <button type="button" data-arch-reader-font="-2" aria-label="Reducir texto bilingüe">A−</button>
          <output data-arch-reader-font-value aria-live="polite">18 px</output>
          <button type="button" data-arch-reader-font="2" aria-label="Aumentar texto bilingüe">A+</button>
        </span></div>
      <div data-arch-reader-nav></div><div class="arch-reader-body" tabindex="0" data-arch-reader-body></div>
      <p class="arch-muted" role="status" data-arch-reader-message></p>
    </section>
  </div>`;
  const $ = selector => el.querySelector(selector);
  const status = $('.arch-status');
  const main = $('.arch-main'), inspector = $('.arch-inspector-content'), reader = $('.arch-reader');
  const graph = $('.arch-graph'), picker = $('.arch-picker-dialog');
  const state = { macroId: null, unidadId: null, momentoId: null, subId: null };
  let model = null, rels = null, capas = null, fichas = null, puentes = null, redFichas = null, catalogo = null, fichaActiva = null, fichaPasoId = null, fichaEnlaceId = null;
  let redVisible = true, redFichaSeleccionada = null, redEnlaceSeleccionado = null;
  const historialFichas = [];
  let conexionesAbiertas = false;
  let marcoAbierto = false, ultimoGrafo = null;
  let perspectiva = 'orientacion', puenteSeleccionado = null;
  let modo = 'momentos', relacionId = null, relacionSubId = null;
  let moduloId = null, enlaceId = null;
  let cy = null, destroyed = false, readerModel = null, chapterNumber = null, readerTicket = 0;
  const abort = new AbortController();
  // N1-U.10: preferencias visuales, guardadas solo en este navegador.
  let layoutStorage = null;
  try { layoutStorage = window.localStorage; } catch { /* Navegador con almacenamiento restringido */ }
  const positions = cargarLayoutLocal(layoutStorage);
  let display = cargarDisplay(layoutStorage);
  const collapsedByGraph = new Map();
  let selectedBranch = null, lastNodeTap = {id:null, at:0};
  function aplicarDisplay() {
    el.style.setProperty('--arch-reader-font', `${display.readerFont}px`);
    $('[data-arch-reader-font-value]').textContent = `${display.readerFont} px`;
    $('[data-arch-graph-font-value]').textContent = `${display.graphFont} px`;
    $('[data-arch-edge-labels]').setAttribute('aria-pressed', String(display.showEdgeNames));
    $('[data-arch-edge-labels]').textContent = display.showEdgeNames ? 'Ocultar nombres' : 'Mostrar nombres';
    if (cy) cy.style(graphStyle(display)); // Conserva nodos, posiciones y viewport.
  }
  function guardarDisplaySeguro() {
    try { display = guardarDisplay(layoutStorage, display); } catch { /* Preferencia de sesión */ }
    aplicarDisplay();
  }
  function contextoRamas() {
    if (redVisible || !fichaActiva || perspectiva !== 'orientacion' || !modeloRamas()) return null;
    const key = `puente:${fichaActiva}:orientacion:`;
    if (!collapsedByGraph.has(key)) collapsedByGraph.set(key, new Set());
    return {key, collapsed:collapsedByGraph.get(key)};
  }
  function modeloRamas() { return model && fichas && puentes?.porFicha.has(fichaActiva); }
  function alternarRama(nodeId) {
    const info = contextoRamas(); if (!info || !nodeId) return;
    const full = elementosContextoEstructural(model, fichas, puentes, fichaActiva);
    if (!(hijosEstructurales(full).get(nodeId)||[]).length) return;
    if (info.collapsed.has(nodeId)) info.collapsed.delete(nodeId); else info.collapsed.add(nodeId);
    selectedBranch = nodeId; dibujar();
  }
  aplicarDisplay();
  function avisoLayout(message) { const target = $('[data-arch-layout-status]'); if (target) target.textContent = message; }
  function snapshotLayout() {
    if (!cy || !ultimoGrafo) return;
    for (const n of cy.nodes()) {
      if (n.data('tipo') !== 'modulo_contenedor') positions.set(ultimoGrafo + n.id(), { ...n.position() });
    }
  }
  const selected = () => obtenerContexto(model, state);
  function navegar(kind, id = null) {
    if (!model) return;
    redVisible = false; fichaActiva = null; fichaPasoId = null; fichaEnlaceId = null; puenteSeleccionado = null;
    if (kind === 'libro') Object.assign(state, { macroId: null, unidadId: null, momentoId: null, subId: null });
    if (kind === 'macro') {
      if (!model.macros.some(x => x.id === id)) return;
      Object.assign(state, { macroId: id, unidadId: null, momentoId: null, subId: null });
    }
    if (kind === 'unidad') {
      if (!selected().macro?.unidades.some(u => u.id === id)) return;
      Object.assign(state, { unidadId: id, momentoId: null, subId: null });
      modo = id === 'proemio' && capas ? 'modulos' : 'momentos';
    }
    if (kind === 'momento') {
      if (!selected().momentos.some(m => m.id === id)) return;
      Object.assign(state, { momentoId: id, subId: null });
    }
    if (kind === 'subunidad') {
      if (!selected().momento?.subIds.includes(id)) return;
      state.subId = id;
    }
    // La selección de una nueva unidad invalida la selección argumentativa anterior.
    relacionId = null; relacionSubId = null; moduloId = null; enlaceId = null;
    dibujar();
  }
  function abrirFicha(id, origen = 'selector') {
    if (!fichas?.porId.has(id)) return;
    if (origen === 'selector') historialFichas.length = 0;
    if (origen === 'relacion' && fichaActiva && fichaActiva !== id) historialFichas.push(fichaActiva);
    marcoAbierto = false; conexionesAbiertas = false;
    redVisible = false; fichaActiva = id;
    fichaPasoId = null; fichaEnlaceId = null; puenteSeleccionado = null; perspectiva = 'orientacion';
    if (id === 'proemio') {
      const macro = model.macros.find(m => m.unidades.some(u => u.id === 'proemio'));
      if (!macro) return;
      Object.assign(state, { macroId: macro.id, unidadId: 'proemio', momentoId: null, subId: null });
      modo = 'modulos'; relacionId = null; relacionSubId = null; moduloId = null; enlaceId = null;
    }
    dibujar();
  }
  function abrirRed(fichaId = null, enlaceId = null) {
    redVisible = true; fichaActiva = null; marcoAbierto = false;
    historialFichas.length = 0;
    redFichaSeleccionada = fichaId && fichas?.porId.has(fichaId) ? fichaId : null;
    redEnlaceSeleccionado = enlaceId && redFichas?.porId.has(enlaceId) ? enlaceId : null;
    dibujar();
  }
  function dibujar() {
    if (!model || destroyed) return;
    const ctx = selected();
    const ficha = fichas?.porId.get(fichaActiva) || null;
    const faq = ficha?.tipo === 'faq' ? ficha : null;
    const puenteVisible = !redVisible && !!ficha && !!puentes && perspectiva !== 'diagrama';
    const disponible = !redVisible && !puenteVisible && !faq && ctx.unidad?.id === 'proemio' && !!rels && !!capas;
    const sintetico = disponible && modo === 'modulos';
    const argumentativo = disponible && modo === 'relaciones';
    $('.arch-perspectivas').hidden = redVisible || !ficha;
    $('[data-arch-network]').setAttribute('aria-pressed', String(redVisible));
    const volverFicha = $('[data-arch-previous]');
    volverFicha.hidden = redVisible || !ficha || !historialFichas.length;
    if (!volverFicha.hidden) volverFicha.title = `Volver a ${fichas.porId.get(historialFichas.at(-1))?.titulo || 'ficha anterior'}`;
    $('[data-arch-current-ficha]').textContent = redVisible ? 'Vista general · siete fichas'
      : ficha ? ficha.titulo : 'Archivo estructural del Libro I';
    for (const b of el.querySelectorAll('[data-arch-perspectiva]')) b.setAttribute('aria-pressed', String(b.dataset.archPerspectiva === perspectiva));
    $('.arch-modes').hidden = !(disponible && !!ficha);
    $('[data-arch-back="libro"]').hidden = redVisible || !!ficha;
    $('[data-arch-legacy]').hidden = redVisible || !ficha;
    $('[data-arch-legend]').textContent = redVisible ? 'Las flechas representan relaciones propuestas entre fichas, no conexiones automáticas derivadas del tagueo.' : puenteVisible ? (perspectiva === 'orientacion' ? 'Solo pasajes y unidades elegidos por la ficha: las líneas tenues representan pertenencia documental, no inferencias filosóficas.' : 'Pasajes vinculados directamente con la explicación; consulta bilingüe disponible.') : faq ? (faq.fuente_editorial?.origen === 'propuesta_lab' ? 'Las flechas punteadas muestran un orden explicativo propuesto, todavía no publicado.' : 'Las flechas punteadas indican el orden del trayecto publicado, no demostraciones.') : 'Las relaciones argumentativas del Proemio son hipótesis todavía no validadas.';
    const descripcion = $('.arch-ficha-panel');
    descripcion.hidden = !ficha;
    descripcion.innerHTML = ficha ? fichaIntroHtml(ficha) : '';
    const marco = descripcion.querySelector('.arch-ficha-intro');
    if (marco) {
      marco.open = marcoAbierto;
      marco.addEventListener('toggle', () => { marcoAbierto = marco.open; });
    }
    for (const b of el.querySelectorAll('[data-arch-card]')) b.setAttribute('aria-pressed', String(b.dataset.archCard === fichaActiva));
    const vistaActiva = sintetico ? 'modulos' : argumentativo ? 'relaciones' : 'momentos';
    for (const b of el.querySelectorAll('[data-arch-mode]')) b.setAttribute('aria-pressed', String(b.dataset.archMode === vistaActiva));
    inspector.innerHTML = redVisible ? inspectorRedFichasHtml(fichas, redFichas, redFichaSeleccionada, redEnlaceSeleccionado)
      : puenteVisible ? (perspectiva === 'orientacion' ? inspectorContextoEstructuralHtml(model, fichas, puentes, ficha.id, puenteSeleccionado) : inspectorPuentesHtml(model, fichas, puentes, ficha.id, perspectiva, puenteSeleccionado))
      : faq ? inspectorFichaFAQHtml(faq, model, fichaPasoId, fichaEnlaceId)
      : sintetico ? inspectorModulosHtml(model, capas, moduloId, enlaceId)
      : argumentativo ? inspectorRelacionesHtml(model, rels, relacionId, relacionSubId) : inspectorHtml(model, state);
    if (ficha && !redVisible) {
      inspector.insertAdjacentHTML('afterbegin', conexionesFichaHtml(fichas, redFichas, ficha.id));
      const d = inspector.querySelector('[data-arch-conexiones]');
      if (d) { d.open = conexionesAbiertas; d.addEventListener('toggle', () => { conexionesAbiertas = d.open; }); }
    }
    $('[data-arch-back="macro"]').hidden = !!ficha || !ctx.macro;
    $('[data-arch-back="unidad"]').hidden = !!ficha || !ctx.unidad;
    $('[data-arch-back="momento"]').hidden = !!ficha || !ctx.momento;
    // El texto editorial es la puerta de entrada: seleccionar un pasaje activa su nodo,
    // y seleccionar un nodo actualiza este comentario (sin agregar aristas automáticas).
    if (ficha) {
      const bridge = puentes?.porFicha.get(ficha.id);
      const seleccionadoApoyo = ['orientacion','apoyos'].includes(perspectiva) && puenteSeleccionado?.startsWith('sub:')
        ? bridge?.apoyos.find(a => 'sub:' + a.sub_id === puenteSeleccionado)?.paso_id : null;
      const pasoGuia = seleccionadoApoyo || fichaPasoId;
      const subGuia = ficha.pasos?.find(p => p.id === pasoGuia)?.sub_id || ficha.pasos?.[0]?.sub_id;
      const unidadGuia = subGuia ? model.subs.get(subGuia)?.unidad : null;
      inspector.insertAdjacentHTML('afterbegin', guiaExplicativaHtml(ficha, capas, {
        pasoId: pasoGuia, moduloId, puente: bridge, unidadId: unidadGuia,
      }));
      // Una FAQ compone fichas base y adaptaciones (subfichas), sin copiar el contenido canónico.
      inspector.insertAdjacentHTML('beforeend', composicionFaqHtml(catalogo, ficha.id));
    }
    graph.setAttribute('aria-label', redVisible ? 'Red de siete fichas filosóficas y relaciones editoriales propuestas' : puenteVisible ? `Ficha ${ficha.titulo}: ${perspectiva === 'orientacion' ? 'contexto editorial' : 'pasajes de apoyo'}` : faq ? `Trayecto editorial de la FAQ: ${faq.titulo}` : 'Grafo de arquitectura del Libro I');
    if (cy) {
      const elements = redVisible ? elementosRedFichas(fichas, redFichas, { fichaId:redFichaSeleccionada, enlaceId:redEnlaceSeleccionado })
        : puenteVisible ? (perspectiva === 'orientacion' ? elementosContextoEstructural(model, fichas, puentes, ficha.id, { id: puenteSeleccionado }) : elementosPuentes(model, fichas, puentes, ficha.id, perspectiva, { id: puenteSeleccionado }))
        : faq ? elementosFichaFAQ(faq, model, { pasoId: fichaPasoId, enlaceId: fichaEnlaceId })
        : sintetico ? elementosCapaBasica(capas, { moduloId, enlaceId })
        : argumentativo ? elementosCapaDetallada(model, capas, { relacionId, subId: relacionSubId, moduloId })
        : elementosArquitectura(model, state);
      // Contraer solo descendientes de la ficha en el respaldo documental: NO toca la red filosófica.
      const ramaInfo = puenteVisible && perspectiva === 'orientacion' ? contextoRamas() : null;
      const completos = elements;
      const visibles = ramaInfo ? proyectarRamasEstructurales(completos, ramaInfo.collapsed) : completos;
      const toggleBranch = $('[data-arch-toggle-branch]');
      const canBranch = ramaInfo && selectedBranch && (hijosEstructurales(completos).get(selectedBranch)||[]).length > 0;
      toggleBranch.hidden = !canBranch;
      if (canBranch) toggleBranch.textContent = ramaInfo.collapsed.has(selectedBranch) ? 'Expandir rama' : 'Contraer rama';
      $('[data-arch-gestos]').hidden = !ramaInfo;
      // Posiciones independientes para cada ficha y resolución.
      const posGroup = redVisible ? 'red-fichas:' : puenteVisible ? `puente:${ficha.id}:${perspectiva}:` : faq ? `ficha:${faq.id}:` : sintetico ? 'modulos:' : argumentativo ? 'relaciones:' : 'estructura:';
      for (const e of visibles) if (e.group === 'nodes' && e.data.tipo !== 'modulo_contenedor' && positions.has(posGroup + e.data.id)) e.position = positions.get(posGroup + e.data.id);
      // Mantener el encuadre al inspeccionar nodos y aristas del MISMO grafo.
      // En cambios de ficha/perspectiva sí se ajusta el nuevo conjunto de nodos.
      const vistaAnterior = ultimoGrafo === posGroup ? { zoom: cy.zoom(), pan: { ...cy.pan() } } : null;
      cy.batch(() => { cy.elements().remove(); cy.add(visibles); });
      cy.resize();
      if (vistaAnterior) { cy.zoom(vistaAnterior.zoom); cy.pan(vistaAnterior.pan); }
      else cy.fit(cy.elements(), 38);
      ultimoGrafo = posGroup;
    }
  }
  function volverLectura() {
    ++readerTicket; readerModel = null; chapterNumber = null;
    reader.hidden = true; main.hidden = false;
    $('[data-arch-reader-body]').replaceChildren();
    if (cy) cy.resize(); // Conserva el zoom elegido al volver de la lectura bilingüe.
  }
  function pintarLectura() {
    if (!readerModel?.ok || destroyed) return;
    const vista = representarLecturaContextual(readerModel, chapterNumber);
    $('[data-arch-reader-title]').textContent = vista.title;
    $('[data-arch-reader-ref]').textContent = vista.reference ? `Subunidad: ${readerModel.passage.title || readerModel.passage.id} · ${ref(vista.reference)}` : 'Capítulo de contexto, sin resaltado';
    $('[data-arch-reader-nav]').innerHTML = vista.navigationHtml;
    $('[data-arch-reader-body]').innerHTML = vista.passageHtml;
    $('[data-arch-reader-message]').textContent = vista.message;
    const body = $('[data-arch-reader-body]'); body.scrollTop = 0;
    if (vista.highlighted) {
      const chosen = body.querySelector('.reader-paragraph--selected');
      if (chosen) requestAnimationFrame(() => { if (!reader.hidden) body.scrollTop = Math.max(0, chosen.offsetTop - body.offsetTop - 24); });
    }
  }
  async function leer(subId) {
    if (!model?.subs.has(subId)) return;
    const snap = model.subs.get(subId), source = App.S?.SUB?.[subId];
    // App.getLibrary procede de /api/contenido. Evitar una lectura cruzada si se modificó el tagueo.
    if (!source || JSON.stringify(source.bekker) !== JSON.stringify(snap.bekker)
      || JSON.stringify(source.gr_ancla) !== JSON.stringify(snap.gr_ancla)
      || JSON.stringify(source.es_ancla) !== JSON.stringify(snap.es_ancla)) {
      status.textContent = 'El corpus cambió desde que abriste Ágora. Recargá la página antes de leer este pasaje.';
      return;
    }
    const ticket = ++readerTicket; main.hidden = true; reader.hidden = false;
    $('[data-arch-reader-title]').textContent = 'Preparando lectura…';
    $('[data-arch-reader-body]').replaceChildren();
    $('[data-arch-reader-nav]').replaceChildren();
    $('[data-arch-reader-message]').textContent = 'Localizando el pasaje en ambas lenguas…';
    try {
      const library = await App.getLibrary();
      if (destroyed || reader.hidden || ticket !== readerTicket) return;
      readerModel = localizarSubunidadEnBiblioteca(library, subId);
      if (!readerModel.ok) {
        $('[data-arch-reader-title]').textContent = 'Pasaje no localizado';
        $('[data-arch-reader-message]').textContent = readerModel.motivo;
        return;
      }
      chapterNumber = readerModel.passage.chapter;
      pintarLectura();
    } catch (error) {
      if (destroyed || ticket !== readerTicket) return;
      $('[data-arch-reader-title]').textContent = 'No se pudo cargar el texto';
      $('[data-arch-reader-message]').textContent = String(error.message || error);
    }
  }
  el.addEventListener('click', event => {
    const graphFont = event.target.closest('[data-arch-graph-font]');
    if (graphFont) { display = variarFuente(display,'graphFont',Number(graphFont.dataset.archGraphFont)); guardarDisplaySeguro(); return; }
    const readerFont = event.target.closest('[data-arch-reader-font]');
    if (readerFont) { display = variarFuente(display,'readerFont',Number(readerFont.dataset.archReaderFont)); guardarDisplaySeguro(); return; }
    if (event.target.closest('[data-arch-edge-labels]')) { display = {...display, showEdgeNames:!display.showEdgeNames}; guardarDisplaySeguro(); return; }
    if (event.target.closest('[data-arch-toggle-branch]')) { alternarRama(selectedBranch); return; }
    const guidedStep = event.target.closest('[data-arch-guide-step]');
    if (guidedStep && fichas?.porId.get(fichaActiva)?.pasos?.some(p => p.id === guidedStep.dataset.archGuideStep)) {
      perspectiva = 'diagrama'; fichaPasoId = guidedStep.dataset.archGuideStep; fichaEnlaceId = null;
      puenteSeleccionado = null; dibujar(); return;
    }
    const guidedModule = event.target.closest('[data-arch-guide-module]');
    if (guidedModule && fichaActiva === 'proemio' && capas?.porId.has(guidedModule.dataset.archGuideModule)) {
      perspectiva = 'diagrama'; modo = 'modulos'; moduloId = guidedModule.dataset.archGuideModule;
      enlaceId = null; dibujar(); return;
    }
    const guidedSupport = event.target.closest('[data-arch-guide-support]');
    if (guidedSupport && puentes?.porFicha.get(fichaActiva)?.apoyos.some(a => a.sub_id === guidedSupport.dataset.archGuideSupport)) {
      perspectiva = 'apoyos'; puenteSeleccionado = 'sub:' + guidedSupport.dataset.archGuideSupport; dibujar(); return;
    }
    const guidedUnit = event.target.closest('[data-arch-guide-unit]');
    if (guidedUnit && puentes?.porFicha.get(fichaActiva)?.contextos.unidades.some(u => u.id === guidedUnit.dataset.archGuideUnit)) {
      perspectiva = 'orientacion'; puenteSeleccionado = 'unidad:' + guidedUnit.dataset.archGuideUnit; dibujar(); return;
    }
    if (event.target.closest('[data-arch-layout-save]')) {
      try { snapshotLayout(); const n = guardarLayoutLocal(layoutStorage, positions); avisoLayout(`Disposición guardada · ${n} nodos en este navegador`); }
      catch (err) { avisoLayout(`No se pudo guardar: ${String(err.message || err)}`); }
      return;
    }
    if (event.target.closest('[data-arch-layout-reset]')) {
      if (ultimoGrafo) {
        limpiarGrupo(positions, ultimoGrafo);
        try { guardarLayoutLocal(layoutStorage, positions); } catch { /* Se informa el efecto de esta sesión igualmente */ }
        ultimoGrafo = null; dibujar(); avisoLayout('Se restauró el diseño inicial de esta vista.');
      }
      return;
    }
    if (event.target.closest('[data-arch-layout-import-open]')) {
      $('[data-arch-layout-import]')?.click(); return;
    }
    if (event.target.closest('[data-arch-layout-export]')) {
      try {
        snapshotLayout();
        const blob = new Blob([JSON.stringify(layoutParaGuardar(positions), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob), anchor = document.createElement('a');
        anchor.href = url; anchor.download = 'agora-disposiciones-grafos.json';
        document.body.append(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        avisoLayout('Archivo de posiciones exportado.');
      } catch (err) { avisoLayout(`Error al exportar: ${String(err.message || err)}`); }
      return;
    }
    if (event.target === picker) { picker.close(); return; } // Clic fuera del contenido del modal.
    if (event.target.closest('[data-arch-picker-close]')) { picker.close(); return; }
    if (event.target.closest('[data-arch-picker-open]')) {
      if (fichas && !picker.open) picker.showModal();
      return;
    }
    if (event.target.closest('[data-arch-network]')) { abrirRed(fichaActiva); return; }
    if (event.target.closest('[data-arch-previous]')) {
      const anterior = historialFichas.pop();
      if (anterior && fichas?.porId.has(anterior)) abrirFicha(anterior, 'retorno');
      return;
    }
    const relGo = event.target.closest('[data-arch-related-go]');
    if (relGo && fichaActiva) {
      const r = redFichas?.porId.get(relGo.dataset.archRelatedId);
      if (r && [r.desde, r.hacia].includes(fichaActiva) &&
          (r.desde === fichaActiva ? r.hacia : r.desde) === relGo.dataset.archRelatedGo) {
        abrirFicha(relGo.dataset.archRelatedGo, 'relacion');
      }
      return;
    }
    const relMap = event.target.closest('[data-arch-related-map]');
    if (relMap && fichaActiva) {
      const r = redFichas?.porId.get(relMap.dataset.archRelatedMap);
      if (r && (r.desde === fichaActiva || r.hacia === fichaActiva)) abrirRed(null, r.id);
      return;
    }
    if (event.target.closest('[data-arch-red-list]')) { redFichaSeleccionada = null; redEnlaceSeleccionado = null; dibujar(); return; }
    const redLink = event.target.closest('[data-arch-red-link]');
    if (redLink && redFichas?.porId.has(redLink.dataset.archRedLink)) { redEnlaceSeleccionado = redLink.dataset.archRedLink; redFichaSeleccionada = null; redVisible = true; fichaActiva = null; dibujar(); return; }
    const cardButton = event.target.closest('[data-arch-card]');
    if (cardButton && fichas?.porId.has(cardButton.dataset.archCard)) {
      if (picker.open) picker.close();
      abrirFicha(cardButton.dataset.archCard); return;
    }
    const perspectiveButton = event.target.closest('[data-arch-perspectiva]');
    if (perspectiveButton && fichaActiva) {
      const next = perspectiveButton.dataset.archPerspectiva;
      if (!['orientacion', 'diagrama', 'apoyos'].includes(next)) return;
      perspectiva = next; puenteSeleccionado = null;
      if (next === 'diagrama' && fichaActiva === 'proemio') modo = 'modulos';
      dibujar(); return;
    }
    const bridgeButton = event.target.closest('[data-arch-bridge]');
    if (bridgeButton && fichaActiva && puentes?.porFicha.has(fichaActiva)) {
      const id = bridgeButton.dataset.archBridge;
      const grupo = puentes.porFicha.get(fichaActiva);
      const validos = perspectiva === 'orientacion' ? [
        ...grupo.contextos.macros.map(m => `macro:${m.id}`), ...grupo.contextos.unidades.map(u => `unidad:${u.id}`),
        ...grupo.apoyos.map(s => `sub:${s.sub_id}`)
      ] : grupo.apoyos.map(s => `sub:${s.sub_id}`);
      if (validos.includes(id)) {
        puenteSeleccionado = id;
        // Selección alternativa con teclado: los botones del inspector habilitan también
        // el control de expandir/contraer sin necesidad de un doble clic sobre el lienzo.
        if (perspectiva === 'orientacion') selectedBranch = `puente:${fichaActiva}:${id}`;
        dibujar();
      }
      return;
    }
    const goUnit = event.target.closest('[data-arch-go-unit]');
    if (goUnit && puentes?.porFicha.get(fichaActiva)?.contextos.unidades.some(u => u.id === goUnit.dataset.archGoUnit)) {
      const macro = model.macros.find(m => m.unidades.some(u => u.id === goUnit.dataset.archGoUnit));
      if (!macro) return;
      Object.assign(state, { macroId: macro.id, unidadId: goUnit.dataset.archGoUnit, momentoId: null, subId: null });
      fichaActiva = null; puenteSeleccionado = null; modo = 'momentos'; dibujar(); return;
    }
    if (event.target.closest('[data-arch-legacy]')) {
      fichaActiva = null; puenteSeleccionado = null; navegar('libro'); return;
    }
    const cardStep = event.target.closest('[data-arch-card-step]');
    if (cardStep && fichas?.porId.get(fichaActiva)?.pasos.some(p => p.id === cardStep.dataset.archCardStep)) {
      fichaPasoId = cardStep.dataset.archCardStep; fichaEnlaceId = null; dibujar(); return;
    }
    const cardLink = event.target.closest('[data-arch-card-link]');
    if (cardLink && fichas?.porId.get(fichaActiva)?.transiciones.some((_, i) => `p${i + 1}->p${i + 2}` === cardLink.dataset.archCardLink)) {
      fichaEnlaceId = cardLink.dataset.archCardLink; fichaPasoId = null; dibujar(); return;
    }
    if (event.target.closest('[data-arch-card-list]')) { fichaPasoId = null; fichaEnlaceId = null; dibujar(); return; }
    const modeButton = event.target.closest('[data-arch-mode]');
    if (modeButton) {
      if (selected().unidad?.id !== 'proemio' || !rels) return;
      const next = modeButton.dataset.archMode;
      if (!['modulos', 'relaciones'].includes(next)) return;
      modo = next;
      relacionId = null; relacionSubId = null; moduloId = null; enlaceId = null;
      dibujar(); return;
    }
    const modButton = event.target.closest('[data-arch-mod-select]');
    if (modButton && capas?.porId.has(modButton.dataset.archModSelect)) {
      modo = 'modulos'; moduloId = modButton.dataset.archModSelect; enlaceId = null; dibujar(); return;
    }
    const linkButton = event.target.closest('[data-arch-link-select]');
    if (linkButton && capas?.enlaces.some(e => e.id === linkButton.dataset.archLinkSelect)) {
      modo = 'modulos'; enlaceId = linkButton.dataset.archLinkSelect; moduloId = null; dibujar(); return;
    }
    if (event.target.closest('[data-arch-mod-list]')) { moduloId = null; enlaceId = null; dibujar(); return; }
    const detailModule = event.target.closest('[data-arch-detail-module]');
    if (detailModule && capas?.porId.has(detailModule.dataset.archDetailModule)) {
      modo = 'relaciones'; moduloId = detailModule.dataset.archDetailModule;
      relacionSubId = null; relacionId = null; dibujar(); return;
    }
    const detailSub = event.target.closest('[data-arch-detail-sub]');
    if (detailSub && capas?.porSub.has(detailSub.dataset.archDetailSub)) {
      modo = 'relaciones'; relacionSubId = detailSub.dataset.archDetailSub;
      relacionId = null; moduloId = capas.porSub.get(relacionSubId); dibujar(); return;
    }
    const detailRel = event.target.closest('[data-arch-detail-rel]');
    if (detailRel && rels?.porId.has(detailRel.dataset.archDetailRel)) {
      modo = 'relaciones'; relacionId = detailRel.dataset.archDetailRel;
      relacionSubId = null; moduloId = null; dibujar(); return;
    }
    const relButton = event.target.closest('[data-arch-rel-select]');
    if (relButton && rels?.porId.has(relButton.dataset.archRelSelect)) {
      relacionId = relButton.dataset.archRelSelect; relacionSubId = null; dibujar(); return;
    }
    if (event.target.closest('[data-arch-rel-list]')) { relacionId = null; relacionSubId = null; dibujar(); return; }
    const nav = event.target.closest('[data-arch-kind]');
    if (nav) { navegar(nav.dataset.archKind, nav.dataset.archId); return; }
    const back = event.target.closest('[data-arch-back]');
    if (back) {
      const { macro, unidad, momento } = selected();
      if (back.dataset.archBack === 'libro') navegar('libro');
      if (back.dataset.archBack === 'macro' && macro) navegar('macro', macro.id);
      if (back.dataset.archBack === 'unidad' && unidad) navegar('unidad', unidad.id);
      if (back.dataset.archBack === 'momento' && momento) navegar('momento', momento.id);
      return;
    }
    const read = event.target.closest('[data-arch-read]');
    if (read) { void leer(read.dataset.archRead); return; }
    if (event.target.closest('[data-arch-fit]')) { cy?.resize(); cy?.fit(cy.elements(), 38); return; }
    if (event.target.closest('[data-arch-reader-back]')) { volverLectura(); return; }
    if (!readerModel?.ok) return;
    const direction = event.target.closest('[data-reader-direction]');
    if (direction) {
      const i = readerModel.book.chapters.findIndex(c => c.number === chapterNumber);
      const next = readerModel.book.chapters[i + Number(direction.dataset.readerDirection)];
      if (next) { chapterNumber = next.number; pintarLectura(); }
    }
  });
  picker.addEventListener('close', () => {
    if (!destroyed) $('[data-arch-picker-open]')?.focus();
  });
  el.addEventListener('change', async event => {
    if (!event.target.matches('[data-arch-layout-import]')) return;
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 250000) throw new Error('El archivo supera el máximo de 250 KB');
      const imported = leerLayout(await file.text());
      positions.clear(); for (const [key, p] of imported) positions.set(key, p);
      try { guardarLayoutLocal(layoutStorage, positions); } catch { /* También funciona solo en esta sesión */ }
      ultimoGrafo = null; dibujar(); avisoLayout(`Disposición importada: ${imported.size} posiciones.`);
    } catch (err) { avisoLayout(`No se pudo importar: ${String(err.message || err)}`); }
    finally { event.target.value = ''; }
  });
  reader.addEventListener('change', event => {
    if (!event.target.matches('[data-reader-chapter]') || !readerModel?.ok) return;
    const next = readerModel.book.chapters.find(c => c.number === Number(event.target.value));
    if (next) { chapterNumber = next.number; pintarLectura(); }
  });
  try {
    const [r, p, a, m, f, v, z, c] = await Promise.all([
      fetch('/api/labo/lectura', { cache: 'no-store', signal: abort.signal }),
      fetch('/lab/n1u1-propuestas-libro-i.json', { cache: 'no-store', signal: abort.signal }),
      fetch('/lab/n1u3-relaciones-proemio.json', { cache: 'no-store', signal: abort.signal }),
      fetch('/lab/n1u4-modulos-proemio.json', { cache: 'no-store', signal: abort.signal }),
      fetch('/lab/n1u5-fichas-explicativas.json', { cache: 'no-store', signal: abort.signal }),
      fetch('/lab/n1u6-puentes-explicativos.json', { cache: 'no-store', signal: abort.signal }),
      fetch('/lab/n1u7-fichas-red-piloto.json', { cache: 'no-store', signal: abort.signal }),
      fetch('/lab/n1u11-catalogo-explicativo.json', { cache: 'no-store', signal: abort.signal }),
    ]);
    if (!r.ok || !p.ok || !a.ok || !m.ok || !f.ok || !v.ok || !z.ok || !c.ok) throw new Error(`No se pudieron cargar las fuentes (MariaDB: ${r.status}; momentos: ${p.status}; relaciones: ${a.status}; módulos: ${m.status}; fichas: ${f.status}; puentes: ${v.status}; ampliación: ${z.status}; catálogo: ${c.status}).`);
    model = construirModeloArquitectura(await r.json(), await p.json());
    rels = construirRelacionesProemio(model, await a.json());
    capas = construirCapasProemio(model, rels, await m.json());
    fichas = construirFichasArquitectura(model, capas, await f.json());
    puentes = construirPuentesExplicativos(model, fichas, await v.json());
    ({ fichas, puentes, red: redFichas } = construirAmpliacionFichas(model, fichas, puentes, await z.json()));
    catalogo = construirCatalogoExplicativo(model, fichas, puentes, await c.json());
    $('.arch-picker-options').innerHTML = opcionesModalFichasHtml(fichas.fichas);
    const macroProemio = model.macros.find(m => m.unidades.some(u => u.id === 'proemio'));
    if (!macroProemio) throw new Error('No se encuentra el Proemio en el mapa de macrounidades.');
    Object.assign(state, { macroId: macroProemio.id, unidadId: 'proemio', momentoId: null, subId: null });
    modo = 'modulos';
    if (destroyed) return { el, destroy() {} };
    main.hidden = false;
    status.textContent = `Revisión ${model.revision.slice(0, 12)}… · ${fichas.fichas.length} fichas introductorias · ${model.stats.unidades} unidades y ${model.stats.subunidades} subunidades como respaldo documental · solo lectura`;
    dibujar();
    try {
      const cytoscape = await cargarCytoscape();
      if (destroyed) return { el, destroy() {} };
      cy = cytoscape({ container: graph, elements: [], style: graphStyle(display), layout: { name: 'preset' },
        minZoom: 0.22, maxZoom: 2.5, wheelSensitivity: ZOOM_SENSITIVITY_ACTUAL, boxSelectionEnabled: false });
      cy.on('tap', 'node', event => {
        const n = event.target;
        if (redVisible && n.data('tipo') === 'ficha_red') { redFichaSeleccionada = n.data('key'); redEnlaceSeleccionado = null; dibujar(); return; }
        if (fichaActiva && perspectiva === 'orientacion' && puentes?.porFicha.has(fichaActiva)) {
          // Primer tap inspecciona. Segundo tap sobre el MISMO nodo en 360 ms contrae/expande.
          const id = n.id(), now = Date.now(), same = lastNodeTap.id === id && now - lastNodeTap.at <= 360;
          lastNodeTap = same ? {id:null,at:0} : {id,at:now};
          selectedBranch = id;
          if (same && n.data('tieneHijos') === 1) { alternarRama(id); return; }
          puenteSeleccionado = n.data('tipo') === 'ficha_central' ? null : n.data('key');
          dibujar(); return;
        }
        if (fichaActiva && perspectiva !== 'diagrama' && puentes?.porFicha.has(fichaActiva)) {
          const key = n.data('key');
          if (['macro_referida', 'unidad_referida', 'subunidad_referida'].includes(n.data('tipo'))) {
            puenteSeleccionado = key; dibujar();
          } else if (n.data('tipo') === 'ficha_central') { puenteSeleccionado = null; dibujar(); }
          return;
        }
        if (fichas?.porId.get(fichaActiva)?.tipo === 'faq') {
          if (n.data('tipo') === 'paso_faq') {
            fichaPasoId = n.data('key'); fichaEnlaceId = null; dibujar();
          }
          return;
        }
        if (selected().unidad?.id === 'proemio') {
          if (modo === 'modulos' && n.data('tipo') === 'modulo_argumentativo') {
            moduloId = n.data('key'); enlaceId = null; dibujar(); return;
          }
          if (modo === 'relaciones') {
            if (n.data('tipo') === 'modulo_contenedor') {
              moduloId = n.data('key'); enlaceId = null; modo = 'modulos'; dibujar(); return;
            }
            if (n.data('tipo') === 'subunidad') {
              relacionSubId = n.data('key'); relacionId = null; moduloId = capas.porSub.get(relacionSubId);
              dibujar(); return;
            }
          }
        }
        const kind = ({ macro: 'macro', unidad: 'unidad', momento: 'momento', subunidad: 'subunidad' })[n.data('tipo')];
        if (kind) navegar(kind, n.data('key'));
      });
      cy.on('tap', 'edge[tipo = "relacion_entre_fichas"]', event => {
        if (!redVisible) return;
        redEnlaceSeleccionado = event.target.data('key'); redFichaSeleccionada = null; dibujar();
      });
      cy.on('tap', 'edge[tipo = "contexto_ficha"], edge[tipo = "respaldo_textual"], edge[tipo = "pertenencia_estructural"]', event => {
        if (!fichaActiva || perspectiva === 'diagrama') return;
        puenteSeleccionado = event.target.data('key'); dibujar();
      });
      cy.on('tap', 'edge[tipo = "orden_trayecto"]', event => {
        if (fichas?.porId.get(fichaActiva)?.tipo !== 'faq') return;
        fichaEnlaceId = event.target.data('key'); fichaPasoId = null; dibujar();
      });
      cy.on('tap', 'edge[tipo = "argumentativa_propuesta"]', event => {
        if (modo !== 'relaciones' || selected().unidad?.id !== 'proemio') return;
        relacionId = event.target.data('key'); relacionSubId = null; dibujar();
      });
      cy.on('tap', 'edge[tipo = "argumentativa_resumida"]', event => {
        if (modo !== 'modulos' || selected().unidad?.id !== 'proemio') return;
        enlaceId = event.target.data('key'); moduloId = null; dibujar();
      });
      cy.on('dragfree', 'node', event => {
        if (event.target.data('tipo') === 'modulo_contenedor') return;
        const proemio = selected().unidad?.id === 'proemio';
        const faq = fichas?.porId.get(fichaActiva);
        const group = redVisible ? 'red-fichas:' : fichaActiva && perspectiva !== 'diagrama' ? `puente:${fichaActiva}:${perspectiva}:` : faq?.tipo === 'faq' ? `ficha:${faq.id}:` : proemio && modo === 'modulos' ? 'modulos:' : proemio && modo === 'relaciones' ? 'relaciones:' : 'estructura:';
        positions.set(group + event.target.id(), { ...event.target.position() });
      });
      dibujar();
    } catch (error) {
      $('.arch-graph-fallback').hidden = false;
      $('.arch-graph-fallback').textContent = `No se pudo iniciar Cytoscape: ${String(error.message || error)}. El inspector continúa disponible.`;
    }
  } catch (error) {
    if (!destroyed && error?.name !== 'AbortError') {
      status.textContent = `No se pudo abrir el experimento: ${String(error.message || error)}`;
      status.classList.add('arch-status--error');
    }
  }
  return { el, destroy() { destroyed = true; if (picker.open) picker.close(); abort.abort(); ++readerTicket; cy?.destroy(); css.remove(); displayCss.remove(); } };
}
