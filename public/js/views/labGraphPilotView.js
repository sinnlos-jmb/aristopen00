import { esc } from '../ui.js';
import { buildSemanticProjection, buscarNodosSemanticos } from '../lab/semanticProjection.js';
import { proyeccionAElementos, resumenClasesAElementos, estadisticasElementos } from '../lab/semanticGraphAdapter.js';
import { indexarGrafo, crearEstadoFocal, cambiarFocos, alternarExpansion, obtenerSubgrafoFocal, restaurarBaseFocal } from '../lab/graphFocusExpansion.js';
import { crearVisorGrafo } from '../lab/cytoscapeRenderer.js';
import { filtrarGrafoDidactico, ordenarBusquedaFocal } from '../lab/graphDisplayPolicy.js';
import { integrarIdentidadesVisuales } from '../lab/graphConceptIdentity.js';
import { agruparFaqs, TIPOS_VISIBLES, estadoTiposInicial, normalizarTiposVisibles } from '../lab/graphFaqGrouping.js';
import { incorporarConservados, ocultarNodos } from '../lab/graphNodeVisibility.js';
import { huellaGrafo, claveDisposicion, leerDisposicion, guardarDisposicion, decorarAristasFocales, normalizarTituloArista, MAX_TITULO_ARISTA } from '../lab/graphLayoutPersistence.js';
import { crearNotificadorGrafo } from '../lab/graphUiFeedback.js';
import { buscarVinculosTextuales, estadoTextualInicial } from '../lab/graphTextNavigation.js';
import { claveContextoTextual, normalizarEstadoContexto, construirGrafoContextual, crearGrupoTexto, ordenTextualDe } from '../lab/graphTextContext.js';
import { crearLectorTextual9B } from '../lab/graphPassageReader.js';

// Checkpoint 2: Cytoscape permanece como visor experimental; el corpus es de sólo lectura.
// Focos estables + expansión local reversible + inspector lateral. Sin Relate/MariaDB.
export function createLabGraphPilotView(App) {
  const el = document.createElement('div');
  el.className = 'view-lab scrollable has-scroll';
  const projection = buildSemanticProjection(App?.S || {});
  const identidad = integrarIdentidadesVisuales(proyeccionAElementos(projection));
  const todos = identidad.elementos;
  const huella = huellaGrafo(todos);
  const almacenamiento = (() => { try { return window.localStorage; } catch { return null; } })();
  const visualId = id => identidad.equivalencias.get(id) || id;
  let mostrarParrafos = false;
  let filtrado = filtrarGrafoDidactico(todos, ['concepto_estatico:phusis', 'concepto_estatico:arete', 'concepto_estatico:eudaimonia']);
  let indice = indexarGrafo(filtrado.elementos);
  const predeterminados = ['phusis', 'arete', 'eudaimonia']
    .map(id => [`concepto_estatico:${id}`, `nodo_funcional:${id}`].find(uid => indice.nodos.has(uid)))
    .filter(Boolean);
  if (!predeterminados.length) predeterminados.push(...[...indice.nodos.keys()].slice(0, 3));
  let estado = crearEstadoFocal(indice, predeterminados);
  function reconstruirIndice(focos) {
    filtrado = filtrarGrafoDidactico(todos, focos, { mostrarParrafos });
    indice = indexarGrafo(filtrado.elementos);
    // Se conserva la expansión de los nodos que siguen siendo visibles.
    const previo = estado?.expandidos || new Set();
    estado = crearEstadoFocal(indice, focos);
    estado.expandidos = new Set([...previo].filter(id => indice.nodos.has(id)));
  }
  reconstruirIndice(predeterminados);
  const preferenciasIniciales = () => ({ posiciones: {}, todasEtiquetas: false, etiquetas: [], titulos: {}, tiposVisibles: estadoTiposInicial(), faqExpandidas: [], nodosOcultos: [], nodosConservados: [], texto: estadoTextualInicial(), exploradoresTexto: {} });
  let preferencias = preferenciasIniciales();
  const claveActual = () => claveDisposicion(estado.focos, huella);
  const leerPreferencias = () => { preferencias = leerDisposicion(almacenamiento, claveActual()) ||
    preferenciasIniciales(); };
  leerPreferencias();
  let modo = 'focal';
  let tipo = 'todos';
  let viewer = null;
  let closed = false;
  let generation = 0;
  const tipos = Object.keys(projection.stats.porTipo);
  const $ = selector => el.querySelector(selector);
  const etiqueta = id => indice.nodos.get(id)?.data.label || id;

  el.innerHTML = `<link rel="stylesheet" href="/css/lab-graph-controls-8b.css" /><link rel="stylesheet" href="/css/lab-graph-text-modal-9a1.css" /><div class="lab__inner">
    <nav class="lab-nav"><a class="btn btn--ghost btn--sm" href="#/lab">← Laboratorio</a></nav>
    <header class="lab-exp__header"><h1 class="lab-exp__title">Visor de grafos · identidad compartida</h1></header>
    <section class="lab-card">
      <h2>Navegación focal y exploración libre</h2>
      <p class="hint">${projection.stats.nodos} nodos · ${projection.stats.aristas} vínculos · ${projection.issues.length} incidencias. El grafo documental no se modifica.</p>
      <div class="lab-toolbar" aria-label="Modo de exploración">
        <button type="button" class="lab-btn" id="gv-focal-mode">Vista de focos</button>
        <button type="button" class="lab-btn lab-btn--ghost" id="gv-group-mode">Resumen por tipos</button>
        <button type="button" class="lab-btn lab-btn--ghost" id="gv-all-mode">Universo completo</button>
        <label for="gv-kind">Filtrar universo</label>
        <select id="gv-kind" class="lab-input" disabled><option value="todos">Todos los tipos</option>${tipos.map(t => `<option value="${esc(t)}">${esc(t.replaceAll('_', ' '))}</option>`).join('')}</select>
      </div>
      <div id="gv-focal-controls" class="lab-graph-focal-controls">
        <div class="lab-graph-focus-heading"><strong>Focos</strong><small>Máximo cinco · los focos permanecen visibles</small></div>
        <div id="gv-foci" class="lab-graph-foci"></div>
      </div>
      <form id="gv-search-form" class="lab-form">
        <label for="gv-search">Buscar un concepto para convertirlo en foco</label>
        <input id="gv-search" class="lab-input" type="search" maxlength="180" placeholder="phusis, arete, eudaimonia…" />
        <button type="submit" class="lab-btn">Buscar</button>
        <button type="button" class="lab-btn lab-btn--ghost" id="gv-functional-search">Ver nodos funcionales</button>
      </form>
      <p class="hint">En los resultados aparecen primero los conceptos estáticos; los compartidos reúnen las facetas estática y funcional bajo un único concepto. Las FAQ permanecen disponibles.</p>
      <div id="gv-matches" class="lab-help" aria-live="polite"></div>
      <div class="lab-toolbar">
        <button id="gv-zoom-out" type="button" class="lab-btn lab-btn--ghost" aria-label="Alejar grafo">− Zoom</button>
        <button id="gv-zoom-in" type="button" class="lab-btn lab-btn--ghost" aria-label="Acercar grafo">+ Zoom</button>
        <button id="gv-fit" type="button" class="lab-btn lab-btn--ghost">Ajustar vista</button>
        <button id="gv-hide" type="button" class="lab-btn lab-btn--ghost" disabled>Ocultar selección</button>
        <button id="gv-restore" type="button" class="lab-btn lab-btn--ghost" disabled>Restaurar ocultos</button>
      </div>
      <p class="hint">Texto: seleccioná un concepto, FAQ o arista funcional y elegí «Mostrar unidades relacionadas». El explorador se abre en una ventana independiente; el grafo principal conserva su disposición.</p>
      <p id="gv-usage" class="hint">Doble clic sobre un vecino: expandir sus conexiones. Otro doble clic: contraer su rama. Los focos permanecen visibles. Clic simple: propiedades a la derecha; rueda: zoom; arrastrar: mover.</p>
      <div class="lab-graph-main">
        <div class="lab-graph-canvas-wrap">
          <div class="lab-graph-controls-launch">
            <button type="button" id="gv-controls-toggle" class="lab-btn lab-btn--ghost" aria-controls="gv-controls-panel" aria-expanded="false">⚙ Controles</button>
          </div>
          <div id="gv-canvas" class="lab-graph-canvas" role="region" aria-label="Grafo interactivo de Ágora"></div>
          <section id="gv-controls-panel" class="lab-graph-controls-popup" role="dialog" aria-modal="false" aria-labelledby="gv-controls-title" hidden>
            <div class="lab-graph-controls-heading">
              <strong id="gv-controls-title">Controles del grafo</strong>
              <button type="button" id="gv-controls-close" class="lab-graph-controls-close" aria-label="Cerrar controles">×</button>
            </div>
            <div class="lab-graph-controls-tabs" role="tablist" aria-label="Secciones de controles">
              <button type="button" role="tab" id="gv-tab-nodos" aria-controls="gv-pane-nodos" data-gv-tab="nodos" aria-selected="true" tabindex="0">Nodos</button>
              <button type="button" role="tab" id="gv-tab-aristas" aria-controls="gv-pane-aristas" data-gv-tab="aristas" aria-selected="false" tabindex="-1">Aristas</button>
              <button type="button" role="tab" id="gv-tab-vista" aria-controls="gv-pane-vista" data-gv-tab="vista" aria-selected="false" tabindex="-1">Vista</button>
            </div>
            <div id="gv-pane-nodos" data-gv-pane="nodos" role="tabpanel" aria-labelledby="gv-tab-nodos" class="lab-graph-controls-pane">
              <label class="lab-graph-option"><input id="gv-parrafos" type="checkbox" /> Incluir párrafos</label>
              <fieldset class="lab-graph-type-filters"><legend>Tipos visibles</legend>
                ${TIPOS_VISIBLES.map(([t, label]) => `<label class="lab-graph-option"><input type="checkbox" data-gv-tipo="${esc(t)}" checked /> ${esc(label)}</label>`).join('')}
              </fieldset>
              <p class="hint">Las FAQ se despliegan desde su agrupador. Los focos no se ocultan.</p>
              <div class="lab-graph-controls-actions">
                <button type="button" id="gv-restore-nodes" class="lab-btn lab-btn--ghost">Restaurar nodos ocultos</button>
                <button type="button" id="gv-clear-pins" class="lab-btn lab-btn--ghost">Quitar ramas conservadas</button>
              </div>
              <p id="gv-hidden-nodes" class="hint">Sin nodos ocultos manualmente.</p>
              <details id="gv-hidden-list"><summary>Recuperar uno individualmente</summary><div id="gv-hidden-items" class="lab-graph-hidden-items"></div></details>
              <p class="hint" id="gv-filter-status">Las subunidades permanecen fuera del diagrama.</p>
            </div>
            <div id="gv-pane-aristas" data-gv-pane="aristas" role="tabpanel" class="lab-graph-controls-pane" aria-labelledby="gv-tab-aristas" hidden>
              <label class="lab-graph-option"><input id="gv-edge-labels" type="checkbox" /> Mostrar nombres de todas las aristas</label>
              <p class="hint">Las conexiones directas entre focos se destacan. Para titular o mostrar una arista individual, seleccionála en el grafo y usá el inspector lateral.</p>
            </div>
            <div id="gv-pane-vista" data-gv-pane="vista" role="tabpanel" class="lab-graph-controls-pane" aria-labelledby="gv-tab-vista" hidden>
              <div class="lab-graph-controls-actions">
                <button type="button" id="gv-save-layout" class="lab-btn">Persistir ordenamiento</button>
                <button type="button" id="gv-reset-layout" class="lab-btn lab-btn--ghost">Recuperar ordenamiento guardado</button>
                <button type="button" id="gv-collapse-all" class="lab-btn lab-btn--ghost">Contraer expansiones</button>
                <button type="button" id="gv-default-foci" class="lab-btn lab-btn--ghost">Restaurar tres focos</button>
              </div>
              <p class="hint">Se guardan posiciones, títulos de aristas, filtros, nodos ocultos y ramas conservadas. Solo en este navegador.</p>
            </div>
          </section>
          <div id="gv-toasts" class="lab-graph-toasts" aria-live="polite" aria-atomic="true"></div>
        </div>
        <aside id="gv-inspector" class="lab-panel lab-graph-inspector" aria-label="Propiedades de nodos y aristas"><h3>Propiedades</h3><p>Seleccioná un nodo o una arista.</p></aside>
      </div>
      <p id="gv-status" role="status" class="hint">Preparando el visualizador…</p>
    </section></div>
    <dialog id="gv-text-dialog" class="lab-graph-text-dialog" aria-labelledby="gv-text-title" aria-describedby="gv-text-summary">
      <div class="lab-graph-text-dialog-inner">
        <header class="lab-graph-text-heading">
          <div><small>Explorador textual contextual · Unidades</small><h2 id="gv-text-title">Unidades relacionadas</h2>
            <p id="gv-text-summary" class="hint">Navegación documental sin alterar el grafo conceptual.</p></div>
          <button type="button" id="gv-text-dismiss" class="lab-btn lab-btn--ghost" aria-label="Cerrar explorador textual">Cerrar ×</button>
        </header>
        <div class="lab-graph-text-toolbar">
          <button type="button" id="gv-text-more" class="lab-btn lab-btn--ghost" hidden>Mostrar todas las unidades</button>
          <button type="button" id="gv-text-fit" class="lab-btn lab-btn--ghost">Ajustar vista</button>
          <button type="button" id="gv-text-save" class="lab-btn">Guardar disposición textual</button>
          <button type="button" id="gv-text-recover" class="lab-btn lab-btn--ghost">Recuperar guardada</button>
          <span class="hint">Doble clic: desplegar unidad o agrupador. Flechas: vínculos documentales y orden textual.</span>
        </div>
        <div class="lab-graph-text-content">
          <div id="gv-text-canvas" class="lab-graph-text-canvas" role="region" aria-label="Unidades textuales relacionadas"></div>
          <aside id="gv-text-inspector" class="lab-panel lab-graph-text-inspector" aria-label="Procedencia textual"><h3>Procedencia</h3><p>Seleccioná una unidad o subunidad.</p></aside>
        </div>
        <form id="gv-text-group-form" class="lab-graph-text-group-bar">
          <label for="gv-text-group-name">Agrupador de elementos elegidos</label>
          <input id="gv-text-group-name" class="lab-input" maxlength="90" placeholder="Ej. Contextos secundarios" />
          <button type="submit" class="lab-btn lab-btn--ghost">Crear grupo</button>
          <small id="gv-text-group-count" aria-live="polite">0 seleccionados</small>
        </form>
        <p id="gv-text-status" role="status" class="hint">Las flechas «contiene» indican pertenencia; «sigue en texto» y «continúa» indican orden de lectura, no inferencias filosóficas.</p>
        <p class="hint">El lector de pasajes y el Lab de pasajes se incorporarán en checkpoints posteriores; por ahora se muestran las referencias disponibles.</p>
      </div>
    </dialog>`;

  const status = mensaje => { if (!closed) $('#gv-status').textContent = mensaje; };
  const notificador = crearNotificadorGrafo($('#gv-toasts'));
  const panel = $('#gv-controls-panel');
  const botonControles = $('#gv-controls-toggle');
  const pestanas = [...panel.querySelectorAll('[data-gv-tab]')];
  function seleccionarPestana(seccion, moverFoco = false) {
    for (const tab of pestanas) {
      const activa = tab.dataset.gvTab === seccion;
      tab.setAttribute('aria-selected', String(activa));
      tab.tabIndex = activa ? 0 : -1;
      $(`#gv-pane-${tab.dataset.gvTab}`).hidden = !activa;
      if (activa && moverFoco) tab.focus();
    }
  }
  function mostrarControles(mostrar, devolverFoco = false) {
    panel.hidden = !mostrar;
    botonControles.setAttribute('aria-expanded', String(mostrar));
    if (mostrar) panel.querySelector('[aria-selected="true"]').focus();
    else if (devolverFoco) botonControles.focus();
  }
  botonControles.addEventListener('click', () => mostrarControles(panel.hidden));
  $('#gv-controls-close').addEventListener('click', () => mostrarControles(false, true));
  panel.querySelector('[role="tablist"]').addEventListener('click', e => {
    const tab = e.target.closest('[data-gv-tab]');
    if (tab) seleccionarPestana(tab.dataset.gvTab);
  });
  panel.querySelector('[role="tablist"]').addEventListener('keydown', e => {
    const pos = pestanas.indexOf(e.target);
    if (pos < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? pestanas.length - 1
      : (pos + (e.key === 'ArrowLeft' ? -1 : 1) + pestanas.length) % pestanas.length;
    seleccionarPestana(pestanas[next].dataset.gvTab, true);
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); mostrarControles(false, true); }
  });
  function renderFocos() {
    const caja = $('#gv-foci');
    caja.innerHTML = estado.focos.map(id => `<span class="lab-graph-focus-chip"><strong>${esc(etiqueta(id))}</strong><small>${esc(id)}</small><button type="button" data-gv-remove="${esc(id)}" title="Quitar este foco" aria-label="Quitar foco ${esc(etiqueta(id))}" ${estado.focos.length === 1 ? 'disabled' : ''}>×</button></span>`).join('');
  }
  function anclaDeItem(item) {
    if (!item || modo !== 'focal' || item.navegacionTextual) return null;
    if (item.clase === 'arista' && item.tipo === 'arista_funcional' && item.aristaFuente)
      return { tipo: 'arista_funcional', id: item.aristaFuente, arista: item.id, source: item.source, target: item.target };
    if (item.clase !== 'nodo') return null;
    if (item.tipo === 'faq') return { tipo: 'faq', id: item.id.slice(4), nodo: item.id };
    if (item.tipo === 'concepto_estatico' || item.tipo === 'nodo_funcional')
      return { tipo: 'concepto', id: item.id.split(':').slice(1).join(':'), nodo: item.id };
    return null;
  }
  // 9A.1: segunda instancia Cytoscape dentro de un dialog nativo; no añade texto al grafo principal.
  const dialogoTexto = $('#gv-text-dialog');
  let exploradorTexto = null;
  let generacionTexto = 0;
  let origenDialogo = null;
  const ordenTexto = ordenTextualDe(App.S);
  crearLectorTextual9B({
    dialogo: dialogoTexto,
    inspector: $('#gv-text-inspector'),
    obtenerBiblioteca: () => App.getLibrary(),
  });
  function actualizarCantidadGrupo() {
    const n = exploradorTexto?.estado.seleccionGrupo?.length || 0;
    $('#gv-text-group-count').textContent = `${n} seleccionados`;
  }
  const estadoExplorador = () => exploradorTexto?.estado;
  const actualizarEstadoExplorador = patch => {
    if (!exploradorTexto) return;
    // Capturar coordenadas antes de repintar, incluso si algunos nodos desaparecen en un grupo.
    if (exploradorTexto.visor) exploradorTexto.estado.posiciones = {
      ...exploradorTexto.estado.posiciones, ...exploradorTexto.visor.posiciones() };
    exploradorTexto.estado = normalizarEstadoContexto({ ...exploradorTexto.estado, ...patch });
    actualizarCantidadGrupo();
    void renderExploradorTexto();
  };
  function conservarPosicionesTexto() {
    if (!exploradorTexto) return;
    const { key, estado: actual, visor } = exploradorTexto;
    const estadoNuevo = normalizarEstadoContexto({ ...actual,
      posiciones: { ...actual.posiciones, ...(visor?.posiciones() || {}) } });
    exploradorTexto.estado = estadoNuevo;
    preferencias.exploradoresTexto = { ...preferencias.exploradoresTexto, [key]: estadoNuevo };
  }
  function limpiarExploradorTexto() {
    ++generacionTexto;
    conservarPosicionesTexto();
    exploradorTexto?.visor?.destruir();
    exploradorTexto = null;
    $('#gv-text-canvas').replaceChildren();
  }
  function cerrarExploradorTexto() {
    if (dialogoTexto.open) dialogoTexto.close();
    // Capturar el contexto antes de cambiar el conjunto de focos/preferencias.
    // El evento nativo `close` puede dispararse después de ese cambio.
    limpiarExploradorTexto();
    if (origenDialogo?.isConnected) origenDialogo.focus({ preventScroll: true });
    origenDialogo = null;
  }
  dialogoTexto.addEventListener('close', () => {
    // Escape cierra el diálogo de forma nativa. Si ya se abrió otro, no destruirlo.
    if (dialogoTexto.open) return;
    limpiarExploradorTexto();
    if (origenDialogo?.isConnected) origenDialogo.focus({ preventScroll: true });
    origenDialogo = null;
  });
  $('#gv-text-dismiss').addEventListener('click', cerrarExploradorTexto);
  $('#gv-text-fit').addEventListener('click', () => exploradorTexto?.visor?.ajustar());
  $('#gv-text-recover').addEventListener('click', () => {
    if (!exploradorTexto) return;
    const persisted = leerDisposicion(almacenamiento, claveActual());
    const saved = persisted?.exploradoresTexto?.[exploradorTexto.key];
    if (!saved) { $('#gv-text-status').textContent = 'No hay una disposición textual guardada para este contexto.'; return; }
    exploradorTexto.estado = normalizarEstadoContexto(saved);
    preferencias.exploradoresTexto = { ...preferencias.exploradoresTexto, [exploradorTexto.key]: exploradorTexto.estado };
    // Rehacer la instancia para aplicar las coordenadas guardadas incluso a nodos preexistentes.
    ++generacionTexto;
    exploradorTexto.visor?.destruir();
    exploradorTexto.visor = null;
    $('#gv-text-canvas').replaceChildren();
    actualizarCantidadGrupo();
    void renderExploradorTexto();
    $('#gv-text-status').textContent = 'Disposición textual recuperada.';
  });
  $('#gv-text-save').addEventListener('click', () => {
    if (!exploradorTexto || !viewer || modo !== 'focal') return;
    conservarPosicionesTexto();
    preferencias.posiciones = { ...preferencias.posiciones, ...viewer.posiciones() };
    const ok = guardarDisposicion(almacenamiento, claveActual(), preferencias);
    $('#gv-text-status').textContent = ok ? 'Disposición textual guardada para esta consulta y estos focos.' : 'No se pudo guardar en el navegador.';
  });
  $('#gv-text-group-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!exploradorTexto) return;
    const result = crearGrupoTexto(exploradorTexto.estado, $('#gv-text-group-name').value,
      exploradorTexto.estado.seleccionGrupo);
    if (!result) { $('#gv-text-status').textContent = 'Elegí unidades o subunidades y escribí un nombre válido (máximo 12 grupos).'; return; }
    $('#gv-text-group-name').value = '';
    actualizarEstadoExplorador(result);
  });
  $('#gv-text-more').addEventListener('click', () => {
    const st = estadoExplorador();
    if (st) actualizarEstadoExplorador({ todasUnidades: !st.todasUnidades });
  });
  const encontrarUnidadTexto = id => exploradorTexto?.unidades.find(u => u.id === id);
  function inspeccionarContextoTexto(item) {
    const out = $('#gv-text-inspector');
    if (!exploradorTexto) return;
    if (item?.grupoUsuario) {
      const group = exploradorTexto.estado.grupos.find(g => g.id === item.grupoId);
      if (!group) return;
      const open = exploradorTexto.estado.gruposAbiertos.includes(group.id);
      out.innerHTML = `<h3>${esc(group.titulo)}</h3><p class="hint">Agrupador personal de ${group.miembros.length} elementos. No modifica la pertenencia textual.</p>
        <form data-tm-rename="${esc(group.id)}"><label>Nombre visible <input class="lab-input" maxlength="90" required value="${esc(group.titulo)}" /></label>
        <button class="lab-btn" type="submit">Renombrar</button></form>
        <div class="lab-graph-inspector-actions"><button class="lab-btn lab-btn--ghost" type="button" data-tm-toggle-group="${esc(group.id)}">${open ? 'Contraer grupo' : 'Expandir grupo'}</button>
        <button class="lab-btn lab-btn--ghost" type="button" data-tm-remove-group="${esc(group.id)}">Desagrupar</button></div>`;
      return;
    }
    if (item?.clase === 'arista') {
      out.innerHTML = `<h3>Conexión dirigida</h3><p><strong>${esc(item.relacion || item.nombreAristaVisible || item.tipo || '')}</strong></p>
        <p class="hint">${item.pertenenciaTextual ? 'Pertenencia editorial unidad → subunidad.' : item.ordenTextual ? 'Sucesión en el orden textual registrado, no relación filosófica.' : 'Conexión de navegación visual, no evidencia filosófica.'}</p>`;
      return;
    }
    if (!item || item.anclaContextual) {
      out.innerHTML = `<h3>Procedencia</h3><p>Unidades vinculadas con la selección.</p>
        <p class="hint">Una relación textual explícita y una asociación por tags de párrafo no tienen la misma fuerza documental.</p>`;
      return;
    }
    if (item.unidadTexto) {
      const u = encontrarUnidadTexto(item.unidadId);
      if (!u) return;
      const st = estadoExplorador();
      const abierta = st.unidadesAbiertas.includes(u.id);
      const completa = st.unidadesCompletas.includes(u.id);
      out.innerHTML = `<h3>${esc(u.titulo)}</h3><p><strong>ID:</strong> ${esc(u.id)}</p>
        <p class="hint">${u.subunidades.length} subunidades vinculadas · ${u.todasSubunidades.length} en la unidad.</p>
        <h4>Vínculos registrados</h4><ul>${u.motivos.slice(0, 20).map(m =>
          `<li>${esc(m.via.replaceAll('_', ' '))}${m.referencia ? ` · ${esc(m.referencia)}` : ''}</li>`).join('')}</ul>
        <div class="lab-graph-inspector-actions">
          <button class="lab-btn" type="button" data-tm-unit="${esc(u.id)}">${abierta ? 'Contraer subunidades' : 'Mostrar subunidades vinculadas'}</button>
          <button class="lab-btn lab-btn--ghost" type="button" data-tm-all="${esc(u.id)}">${completa ? 'Solo las vinculadas' : 'Incluir todas como contexto'}</button>
        </div><button class="lab-btn lab-btn--ghost" type="button" data-tm-select="${esc(item.id)}">${st.seleccionGrupo.includes(item.id) ? 'Quitar de agrupación' : 'Elegir para agrupar'}</button>
        <p class="hint">Los tags de párrafo no acreditan una subunidad concreta.</p>`;
      return;
    }
    if (item.subunidadTexto) {
      const u = encontrarUnidadTexto(item.unidadId);
      const sub = u?.subunidades.find(s => s.id === item.subunidadId) || u?.todasSubunidades.find(s => s.id === item.subunidadId);
      const vinculada = u?.subunidades.some(s => s.id === item.subunidadId);
      out.innerHTML = `<h3>${esc(sub?.titulo || item.subunidadId)}</h3>
        <p><strong>ID:</strong> ${esc(item.subunidadId)}</p>
        <p><strong>Bekker:</strong> ${esc(sub?.bekker || item.referencia || 'No consignada')}</p>
        <p class="hint">${vinculada ? 'Vínculo registrado con esta consulta.' : 'Subunidad mostrada como contexto de la unidad; no constituye evidencia directa.'}</p>
        ${vinculada ? `<ul>${sub.motivos.map(m => `<li>${esc(m.via.replaceAll('_',' '))}${m.referencia ? ` · ${esc(m.referencia)}` : ''}</li>`).join('')}</ul>` : ''}
        <button class="lab-btn lab-btn--ghost" type="button" data-tm-select="${esc(item.id)}">${exploradorTexto.estado.seleccionGrupo.includes(item.id) ? 'Quitar de agrupación' : 'Elegir para agrupar'}</button>
        <button class="lab-btn" type="button" data-tm-read-sub="${esc(item.subunidadId)}">Leer pasaje griego / castellano</button>
        <p class="hint">El lector usa las anclas textuales verificadas; no atribuye automáticamente pasajes a un tag de unidad.</p>`;
    }
  }
  async function renderExploradorTexto() {
    const contexto = exploradorTexto;
    if (!contexto || !dialogoTexto.open) return;
    const ticket = ++generacionTexto;
    const resultado = construirGrafoContextual(contexto.ancla, contexto.titulo, contexto.unidades, contexto.estado, {
      ...ordenTexto, focos: estado.focos, etiquetasFoco: Object.fromEntries(estado.focos.map(id => [id, etiqueta(id)])),
      aristasFoco: todos.filter(e => e.group === 'edges' && e.data.tipo === 'arista_funcional'
        && estado.focos.includes(e.data.source) && estado.focos.includes(e.data.target)),
    });
    const posiciones = { ...resultado.posicionesSugeridas, ...contexto.estado.posiciones };
    $('#gv-text-more').hidden = contexto.unidades.length <= 6;
    $('#gv-text-more').textContent = contexto.estado.todasUnidades
      ? 'Mostrar seis unidades' : `Mostrar todas (${contexto.unidades.length})`;
    $('#gv-text-status').textContent = `${resultado.unidadesVisibles} unidades · ${resultado.subunidadesVisibles} subunidades visibles. Navegación documental, no prueba filosófica.`;
    if (contexto.visor) {
      contexto.estado.posiciones = { ...contexto.estado.posiciones, ...contexto.visor.posiciones() };
      contexto.visor.actualizarElementos(resultado.elementos, { posiciones: contexto.estado.posiciones });
      inspeccionarContextoTexto(null);
      return;
    }
    try {
      const visor = await crearVisorGrafo($('#gv-text-canvas'), resultado.elementos, {
        layoutContextual: true, posicionesIniciales: posiciones,
        alSeleccionar: inspeccionarContextoTexto,
        alDobleClick: item => {
          if (item.grupoUsuario && exploradorTexto) {
            const open = new Set(exploradorTexto.estado.gruposAbiertos);
            if (open.has(item.grupoId)) open.delete(item.grupoId); else open.add(item.grupoId);
            actualizarEstadoExplorador({ gruposAbiertos: [...open] });
            return;
          }
          if (!item.unidadTexto || !exploradorTexto) return;
          const prev = new Set(exploradorTexto.estado.unidadesAbiertas);
          if (prev.has(item.unidadId)) prev.delete(item.unidadId); else prev.add(item.unidadId);
          actualizarEstadoExplorador({ unidadesAbiertas: [...prev] });
        },
      });
      if (closed || !dialogoTexto.open || exploradorTexto !== contexto || ticket !== generacionTexto) { visor.destruir(); return; }
      contexto.visor = visor;
      visor.ajustar();
      inspeccionarContextoTexto(null);
    } catch (error) {
      if (!closed && exploradorTexto === contexto) $('#gv-text-status').textContent = `No se pudo dibujar el explorador: ${error.message}`;
    }
  }
  function abrirExploradorTexto(ancla, titulo) {
    const key = claveContextoTextual(ancla);
    if (!key) return;
    const unidades = buscarVinculosTextuales(App.S, ancla);
    if (!unidades.length) { status('No hay vínculos textuales documentados para esta selección.'); return; }
    if (dialogoTexto.open) cerrarExploradorTexto();
    origenDialogo = document.activeElement;
    const estadoTextual = normalizarEstadoContexto(preferencias.exploradoresTexto?.[key]);
    exploradorTexto = { key, ancla, titulo, unidades, estado: estadoTextual, visor: null };
    actualizarCantidadGrupo();
    $('#gv-text-title').textContent = `Unidades relacionadas · ${titulo}`;
    $('#gv-text-summary').textContent = `Foco contextual: ${titulo}. ${unidades.length} unidades con vínculos registrados o asociaciones de indexación; sin añadir nodos al grafo principal.`;
    dialogoTexto.showModal();
    void renderExploradorTexto();
  }
  $('#gv-text-inspector').addEventListener('submit', event => {
    const form = event.target.closest('[data-tm-rename]');
    if (!form || !exploradorTexto) return;
    event.preventDefault();
    const id = form.dataset.tmRename;
    const nombre = form.querySelector('input').value.replace(/\s+/g,' ').trim().slice(0, 90);
    if (!nombre) return;
    actualizarEstadoExplorador({ grupos: exploradorTexto.estado.grupos.map(g => g.id === id ? { ...g, titulo: nombre } : g) });
  });
  $('#gv-text-inspector').addEventListener('click', event => {
    if (!exploradorTexto) return;
    const select = event.target.closest('[data-tm-select]');
    if (select) {
      const ids = new Set(exploradorTexto.estado.seleccionGrupo);
      if (ids.has(select.dataset.tmSelect)) ids.delete(select.dataset.tmSelect); else ids.add(select.dataset.tmSelect);
      actualizarEstadoExplorador({ seleccionGrupo: [...ids] });
      return;
    }
    const tg = event.target.closest('[data-tm-toggle-group]');
    if (tg) {
      const ids = new Set(exploradorTexto.estado.gruposAbiertos);
      if (ids.has(tg.dataset.tmToggleGroup)) ids.delete(tg.dataset.tmToggleGroup); else ids.add(tg.dataset.tmToggleGroup);
      actualizarEstadoExplorador({ gruposAbiertos: [...ids] }); return;
    }
    const rm = event.target.closest('[data-tm-remove-group]');
    if (rm) {
      actualizarEstadoExplorador({ grupos: exploradorTexto.estado.grupos.filter(g => g.id !== rm.dataset.tmRemoveGroup),
        gruposAbiertos: exploradorTexto.estado.gruposAbiertos.filter(id => id !== rm.dataset.tmRemoveGroup) }); return;
    }
    const b = event.target.closest('[data-tm-unit]');
    if (b) {
      const opened = new Set(estadoExplorador().unidadesAbiertas);
      if (opened.has(b.dataset.tmUnit)) opened.delete(b.dataset.tmUnit); else opened.add(b.dataset.tmUnit);
      actualizarEstadoExplorador({ unidadesAbiertas: [...opened] });
    }
    const c = event.target.closest('[data-tm-all]');
    if (c) {
      const completas = new Set(estadoExplorador().unidadesCompletas);
      const id = c.dataset.tmAll;
      if (completas.has(id)) completas.delete(id); else completas.add(id);
      const abiertas = new Set(estadoExplorador().unidadesAbiertas); abiertas.add(id);
      actualizarEstadoExplorador({ unidadesCompletas: [...completas], unidadesAbiertas: [...abiertas] });
    }
  });
  function inspeccionar(item) {
    if (closed) return;
    const out = $('#gv-inspector');
    delete out.dataset.gvTextAnchor;
    if (!item) { out.innerHTML = '<h3>Propiedades</h3><p>Seleccioná un nodo o una arista para examinar su procedencia.</p>'; return; }
    const esArista = item.clase === 'arista';
    const idAristaEditable = esArista ? (item.aristaOriginalId || item.id) : null;
    const tituloPropio = esArista ? preferencias.titulos[idAristaEditable] || '' : '';
    const encabezado = esArista
      ? (tituloPropio || `${etiqueta(item.source)} → ${etiqueta(item.target)}`)
      : (item.label || item.tipo || item.clase);
    const attrs = Object.entries(item).filter(([k,v]) =>
      !['id','label','clase','foco','expandido','compartido','conexionFocos','nombreAristaVisible'].includes(k) && v != null && v !== '');
    out.innerHTML = `<h3>${esc(encabezado)}</h3>
      <p class="lab-graph-id"><strong>ID:</strong> ${esc(item.id || '—')}<br>${esc(item.clase)}</p>
      <dl class="lab-graph-properties">${attrs.map(([k,v]) => `<dt>${esc(k)}</dt><dd>${esc(String(v))}</dd>`).join('')}</dl>`;
    const ancla = anclaDeItem(item);
    if (ancla) {
      const units = buscarVinculosTextuales(App.S, ancla);
      const section = document.createElement('div'); section.className = 'lab-graph-inspector-actions';
      if (units.length) {
        section.innerHTML = `<p class="hint">${units.length} unidades vinculadas en el corpus. Se distingue evidencia de subunidad y contexto de tags.</p>
          <button type="button" class="lab-btn" data-gv-text-open>Mostrar unidades relacionadas</button>`;
      } else {
        section.innerHTML = '<p class="hint">No se encontraron vínculos textuales explícitos para este elemento. No se infieren pasajes.</p>';
      }
      out.append(section);
      out.dataset.gvTextAnchor = JSON.stringify(ancla);
    } else delete out.dataset.gvTextAnchor;
    if (esArista && modo === 'focal' && (!item.agrupacionVisual || item.aristaOriginalId)) {
      const acciones = document.createElement('div');
      acciones.className = 'lab-graph-inspector-actions';
      const habilitada = preferencias.etiquetas.includes(idAristaEditable);
      const global = preferencias.todasEtiquetas;
      acciones.innerHTML = `<form data-gv-edge-editor="${esc(idAristaEditable)}" class="lab-graph-edge-editor">
        <label for="gv-edge-custom-title">Título visible de esta arista (máximo ${MAX_TITULO_ARISTA} caracteres)</label>
        <input id="gv-edge-custom-title" class="lab-input" type="text" maxlength="${MAX_TITULO_ARISTA}" placeholder="Escribir un título breve…" />
        <div class="lab-toolbar">
          <button type="submit" class="lab-btn">Aplicar título</button>
          <button type="button" class="lab-btn lab-btn--ghost" data-gv-edge-reset="${esc(idAristaEditable)}" ${tituloPropio ? '' : 'disabled'}>Restablecer original</button>
          <button type="button" class="lab-btn lab-btn--ghost" data-gv-edge-label="${esc(idAristaEditable)}" ${global ? 'disabled' : ''}>${habilitada ? 'Ocultar etiqueta' : 'Mostrar etiqueta'}</button>
        </div>
        <p class="hint">${global ? 'Con «mostrar todas» activo, las etiquetas individuales no se pueden ocultar.' : 'El título original y su referencia siguen en las propiedades.'} Pulsá «Persistir ordenamiento» para guardar también estos cambios.</p>
      </form>`;
      acciones.querySelector('input').value = tituloPropio;
      out.append(acciones);
    }
    if (item.clase === 'nodo' && item.agrupadorFaq) {
      const actions = document.createElement('div');
      actions.className = 'lab-graph-inspector-actions';
      const grupo = item.id;
      const abierto = preferencias.faqExpandidas.includes(grupo);
      const actual = agruparFaqs(obtenerSubgrafoFocal(estado).elementos, { focos: estado.focos });
      const detalle = actual.grupos.find(g => g.id === grupo);
      actions.innerHTML = `<p class="hint">Agrupación visual, no relación filosófica. ${esc(String(detalle?.miembros.length || 0))} preguntas vinculadas al concepto.</p>
        <ul>${(detalle?.miembros || []).map(id => `<li>${esc(indice.nodos.get(id)?.data.label || id)}</li>`).join('')}</ul>
        <button type="button" class="lab-btn" data-gv-faq-toggle="${esc(grupo)}">${abierto ? 'Contraer FAQ' : 'Desplegar FAQ'}</button>
        <button type="button" class="lab-btn lab-btn--ghost" data-gv-node-hide="${esc(grupo)}">Ocultar agrupador</button>`;
      out.append(actions);
    } else if (item.clase === 'nodo' && !item.resumen && indice.nodos.has(item.id)) {
      const actions = document.createElement('div');
      actions.className = 'lab-graph-inspector-actions';
      const fijo = preferencias.nodosConservados.includes(item.id);
      const esFoco = estado.focos.includes(item.id);
      actions.innerHTML = `<button type="button" class="lab-btn" data-gv-sole="${esc(item.id)}">Usar como único foco</button>
        <button type="button" class="lab-btn lab-btn--ghost" data-gv-add="${esc(item.id)}" ${estado.focos.length >= 5 || esFoco ? 'disabled' : ''}>Añadir a los focos</button>
        <button type="button" class="lab-btn lab-btn--ghost" data-gv-node-pin="${esc(item.id)}" ${esFoco ? 'disabled' : ''}>${fijo ? 'Dejar de conservar rama' : 'Conservar nodo y camino'}</button>
        <button type="button" class="lab-btn lab-btn--ghost" data-gv-node-hide="${esc(item.id)}" ${esFoco ? 'disabled' : ''}>Ocultar nodo</button>`;
      out.append(actions);
    } else if (item.clase === 'nodo' && item.resumen) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'lab-btn lab-btn--ghost';
      button.textContent = `Ver nodos de ${item.tipo}`;
      button.addEventListener('click', () => { modo = 'todo'; tipo = item.tipo; $('#gv-kind').value = tipo; void dibujar(); });
      out.append(button);
    }
  }
  function elementosFocales() {
    const sub = obtenerSubgrafoFocal(estado);
    const rutas = incorporarConservados(sub.elementos, indice, estado.focos,
      preferencias.nodosConservados, preferencias.nodosOcultos);
    const vista = agruparFaqs(rutas.elementos, { focos: estado.focos, expandidos: new Set(preferencias.faqExpandidas),
      tiposVisibles: preferencias.tiposVisibles, nodosOcultos: preferencias.nodosOcultos,
      conservados: preferencias.nodosConservados });
    const visibles = ocultarNodos(vista.elementos, preferencias.nodosOcultos, estado.focos);
    return { sub, vista, rutas, elementos: decorarAristasFocales(visibles, estado.focos, preferencias) };
  }
  function actualizarFocal() {
    // Conservar también la última posición de los nodos que un filtro va a ocultar.
    if (viewer) preferencias.posiciones = { ...preferencias.posiciones, ...viewer.posiciones() };
    const { sub, vista, rutas, elementos } = elementosFocales();
    viewer?.actualizarElementos(elementos, { posiciones: preferencias.posiciones });
    renderFocos();
    const funcionales = sub.elementos.filter(e => e.group === 'nodes' && e.data.facetaFuncional).length;
    $('#gv-filter-status').textContent = `${funcionales} facetas funcionales en la vecindad · ${vista.grupos.length} agrupaciones FAQ · ${vista.agrupadas} preguntas plegadas · ${filtrado.excluidos.parrafos} párrafos ocultos. Subunidades excluidas.`;
    $('#gv-hidden-nodes').textContent = `${preferencias.nodosOcultos.length} nodos ocultos · ${preferencias.nodosConservados.length} nodos conservados${rutas.sinCamino.length ? ` · ${rutas.sinCamino.length} sin camino visible (revisar filtros u ocultaciones)` : ''}.`;
    $('#gv-restore-nodes').disabled = !preferencias.nodosOcultos.length;
    $('#gv-hidden-items').innerHTML = preferencias.nodosOcultos.slice(0, 30).map(id =>
      `<div class="lab-graph-hidden-row"><span>${esc(indice.nodos.get(id)?.data.label || id)}</span><button type="button" class="lab-btn lab-btn--ghost" data-gv-node-restore="${esc(id)}">Mostrar</button></div>`).join('') || '<p class="hint">No hay nodos ocultos.</p>';
    if (preferencias.nodosOcultos.length > 30) $('#gv-hidden-items').insertAdjacentHTML('beforeend', '<p class="hint">Se muestran los primeros 30. Podés restaurar todos para recuperar el resto.</p>');
    $('#gv-clear-pins').disabled = !preferencias.nodosConservados.length;
    status(`${elementos.filter(e => e.group === 'nodes').length} nodos visibles · ${elementos.filter(e => e.group === 'edges').length} conexiones · ${vista.agrupadas} FAQ plegadas · ${sub.estadisticas.expandidos} expansiones de conceptos.`);
  }
  function alternarGrupoFaq(id) {
    const groups = new Set(preferencias.faqExpandidas);
    if (groups.has(id)) groups.delete(id); else groups.add(id);
    preferencias.faqExpandidas = [...groups];
    actualizarFocal();
    const grupo = viewer?.cy.getElementById(id);
    if (grupo?.nonempty()) inspeccionar({ clase: 'nodo', ...grupo.data() });
  }
  function dobleClick(item) {
    if (modo === 'focal' && item.agrupadorFaq) { alternarGrupoFaq(item.id); return; }
    if (modo !== 'focal') {
      const nodo = viewer?.cy.getElementById(item.id);
      nodo?.hide();
      status('Nodo ocultado en esta vista, sin afectar el corpus.');
      return;
    }
    const nuevo = alternarExpansion(estado, item.id);
    if (nuevo === estado) {
      status(estado.focos.includes(item.id) ? 'Los focos forman la base permanente; expandí sus vecinos.' : 'Ese nodo no está disponible para expandir.');
      return;
    }
    const abriendo = nuevo.expandidos.has(item.id);
    estado = nuevo;
    actualizarFocal();
    inspeccionar({ clase: 'nodo', ...indice.nodos.get(item.id).data });
    if (!abriendo) status(`${etiqueta(item.id)}: rama contraída. Los nodos compartidos o pertenecientes a la base permanecen.`);
  }
  async function dibujar() {
    const ticket = ++generation;
    if (dialogoTexto.open) cerrarExploradorTexto();
    viewer?.destruir(); viewer = null;
    $('#gv-canvas').replaceChildren();
    const focal = modo === 'focal';
    const agrupado = modo === 'grupos';
    const elementos = focal ? elementosFocales().elementos : agrupado
      ? resumenClasesAElementos({ nodes: projection.nodes.filter(n => filtrado.elementos.some(e => e.group === 'nodes' && e.data.id === n.uid)), edges: projection.edges.filter(e => filtrado.elementos.some(x => x.group === 'edges' && x.data.id === e.uid)) })
      : filtrado.elementos.filter(e => tipo === 'todos' || (e.group === 'nodes' ? e.data.tipo === tipo : true))
          .filter(e => e.group === 'nodes' || tipo === 'todos' ||
            (indice.nodos.get(e.data.source)?.data.tipo === tipo && indice.nodos.get(e.data.target)?.data.tipo === tipo));
    const stats = estadisticasElementos(elementos);
    $('#gv-focal-controls').hidden = !focal;
    botonControles.hidden = !focal;
    if (!focal && !panel.hidden) mostrarControles(false);
    $('#gv-kind').disabled = modo !== 'todo';
    $('#gv-hide').disabled = focal;
    $('#gv-restore').disabled = focal;
    $('#gv-focal-mode').className = 'lab-btn' + (focal ? '' : ' lab-btn--ghost');
    $('#gv-group-mode').className = 'lab-btn' + (agrupado ? '' : ' lab-btn--ghost');
    $('#gv-all-mode').className = 'lab-btn' + (modo === 'todo' ? '' : ' lab-btn--ghost');
    $('#gv-usage').textContent = focal
      ? 'Doble clic sobre un vecino: expandir conexiones; repetir: contraer. Focos siempre visibles. Clic: inspector lateral. Arrastre y rueda: desplazamiento y zoom.'
      : 'Arrastrá para mover nodos o lienzo. Clic para inspeccionar; doble clic para ocultar sólo en esta vista. La vista focal permite expandir y contraer.';
    inspeccionar(null);
    renderFocos();
    status(`Cargando ${stats.nodos} nodos y ${stats.aristas} vínculos…`);
    try {
      const instance = await crearVisorGrafo($('#gv-canvas'), elementos, {
        agrupado, alSeleccionar: inspeccionar, alDobleClick: dobleClick,
        posicionesIniciales: focal ? preferencias.posiciones : {},
        alOcultar: () => status('Elemento ocultado en esta vista.'),
      });
      if (closed || ticket !== generation) { instance.destruir(); return; }
      viewer = instance;
      if (focal) actualizarFocal();
      else status(`${stats.nodos} nodos · ${stats.aristas} vínculos. ${agrupado ? 'Resumen de tipos, no relaciones filosóficas.' : 'Grafo documental completo o filtrado.'}`);
    } catch (err) {
      if (!closed && ticket === generation) status(`No se pudo cargar el visor: ${err.message}`);
    }
  }
  function sincronizarFiltros() {
    el.querySelectorAll('[data-gv-tipo]').forEach(input => {
      input.checked = preferencias.tiposVisibles[input.dataset.gvTipo] !== false;
    });
  }
  function seleccionarFocos(focos) {
    if (dialogoTexto.open) cerrarExploradorTexto();
    reconstruirIndice(focos);
    leerPreferencias();
    $('#gv-edge-labels').checked = preferencias.todasEtiquetas;
    sincronizarFiltros();
    modo = 'focal'; tipo = 'todos'; $('#gv-kind').value = 'todos';
    void dibujar();
  }
  sincronizarFiltros();
  $('#gv-edge-labels').checked = preferencias.todasEtiquetas;
  $('#gv-focal-mode').addEventListener('click', () => { modo = 'focal'; void dibujar(); });
  $('#gv-group-mode').addEventListener('click', () => { modo = 'grupos'; void dibujar(); });
  $('#gv-all-mode').addEventListener('click', () => { modo = 'todo'; void dibujar(); });
  $('#gv-kind').addEventListener('change', e => { tipo = e.target.value; void dibujar(); });
  $('#gv-zoom-in').addEventListener('click', () => viewer?.zoom(2.1));
  $('#gv-zoom-out').addEventListener('click', () => viewer?.zoom(1 / 2.1));
  $('#gv-fit').addEventListener('click', () => viewer?.ajustar());
  $('#gv-hide').addEventListener('click', () => { viewer?.ocultarSeleccion(); status('Selección ocultada sólo en esta vista.'); });
  $('#gv-restore').addEventListener('click', () => { viewer?.restaurar(); status('Elementos restaurados.'); });
  $('#gv-controls-panel').addEventListener('change', e => {
    const input = e.target.closest('[data-gv-tipo]');
    if (!input) return;
    preferencias.tiposVisibles = { ...preferencias.tiposVisibles, [input.dataset.gvTipo]: input.checked };
    actualizarFocal();
  });
  $('#gv-parrafos').addEventListener('change', e => {
    mostrarParrafos = e.target.checked;
    reconstruirIndice(estado.focos);
    void dibujar();
  });
  $('#gv-edge-labels').addEventListener('change', e => {
    preferencias.todasEtiquetas = e.target.checked;
    if (modo === 'focal') actualizarFocal();
  });
  $('#gv-save-layout').addEventListener('click', () => {
    if (modo !== 'focal' || !viewer) { status('Abrí la vista de focos para guardar su disposición.'); return; }
    preferencias.posiciones = { ...preferencias.posiciones, ...viewer.posiciones() };
    conservarPosicionesTexto();
    const ok = guardarDisposicion(almacenamiento, claveActual(), preferencias);
    status(ok ? 'Ordenamiento, títulos, nodos ocultos y ramas conservadas guardados para estos focos.'
      : 'No se pudo acceder al almacenamiento local. El ordenamiento no fue guardado.');
    notificador.mostrar(ok ? 'Disposición guardada' : 'No se pudo guardar la disposición', { error: !ok });
  });
  $('#gv-reset-layout').addEventListener('click', () => {
    leerPreferencias();
    $('#gv-edge-labels').checked = preferencias.todasEtiquetas;
    sincronizarFiltros();
    void dibujar();
    status('Se recuperó el último ordenamiento guardado, si existe.');
  });
  function aristaVisible(id) {
    const original = viewer?.cy.getElementById(id);
    return original?.nonempty() ? original : viewer?.cy.edges().filter(edge => edge.data('aristaOriginalId') === id).first();
  }
  $('#gv-inspector').addEventListener('submit', e => {
    const form = e.target.closest('[data-gv-edge-editor]');
    if (!form || modo !== 'focal') return;
    e.preventDefault();
    const id = form.dataset.gvEdgeEditor;
    if (!indice.aristas?.has(id)) { status('La arista ya no está disponible.'); return; }
    const titulo = normalizarTituloArista(form.querySelector('input').value);
    if (!titulo) { status('Escribí un título no vacío, o usá «Restablecer original».'); return; }
    preferencias.titulos = { ...preferencias.titulos, [id]: titulo };
    preferencias.etiquetas = [...new Set([...preferencias.etiquetas, id])];
    actualizarFocal();
    const arista = aristaVisible(id);
    if (arista?.nonempty()) inspeccionar({ clase: 'arista', ...arista.data() });
    status('Título aplicado y visible. Usá «Persistir ordenamiento» para conservarlo.');
  });
  $('#gv-inspector').addEventListener('click', e => {
    const open = e.target.closest('[data-gv-text-open]');
    if (open) {
      let ancla = null;
      try { ancla = JSON.parse($('#gv-inspector').dataset.gvTextAnchor || 'null'); } catch {}
      if (ancla) {
        const title = $('#gv-inspector h3')?.textContent || ancla.id;
        abrirExploradorTexto(ancla, title);
      }
      return;
    }
    const ocultar = e.target.closest('[data-gv-node-hide]');
    if (ocultar && modo === 'focal') { ocultarNodo(ocultar.dataset.gvNodeHide); return; }
    const pin = e.target.closest('[data-gv-node-pin]');
    if (pin && modo === 'focal') {
      const id = pin.dataset.gvNodePin;
      conservarNodo(id);
      const nodo = viewer?.cy.getElementById(id);
      if (nodo?.nonempty()) inspeccionar({ clase: 'nodo', ...nodo.data() });
      return;
    }
    const toggleFaq = e.target.closest('[data-gv-faq-toggle]');
    if (toggleFaq) { alternarGrupoFaq(toggleFaq.dataset.gvFaqToggle); return; }
    const reset = e.target.closest('[data-gv-edge-reset]');
    if (reset) {
      const id = reset.dataset.gvEdgeReset;
      if (!indice.aristas?.has(id)) return;
      const { [id]: descartado, ...resto } = preferencias.titulos;
      preferencias.titulos = resto;
      actualizarFocal();
      const arista = aristaVisible(id);
      if (arista?.nonempty()) inspeccionar({ clase: 'arista', ...arista.data() });
      status('Título personalizado restablecido. Persistí el ordenamiento para guardar el cambio.');
      return;
    }
    const boton = e.target.closest('[data-gv-edge-label]');
    if (!boton || preferencias.todasEtiquetas) return;
    const id = boton.dataset.gvEdgeLabel;
    const etiquetas = new Set(preferencias.etiquetas);
    if (etiquetas.has(id)) etiquetas.delete(id); else etiquetas.add(id);
    preferencias.etiquetas = [...etiquetas];
    actualizarFocal();
    const arista = aristaVisible(id);
    if (arista?.nonempty()) inspeccionar({ clase: 'arista', ...arista.data() });
  });
  $('#gv-collapse-all').addEventListener('click', () => { estado = restaurarBaseFocal(estado); actualizarFocal(); });
  $('#gv-restore-nodes').addEventListener('click', () => {
    preferencias.nodosOcultos = []; actualizarFocal(); status('Nodos ocultos manualmente restaurados.');
  });
  $('#gv-hidden-items').addEventListener('click', e => {
    const boton = e.target.closest('[data-gv-node-restore]');
    if (!boton) return;
    preferencias.nodosOcultos = preferencias.nodosOcultos.filter(id => id !== boton.dataset.gvNodeRestore);
    actualizarFocal();
  });
  $('#gv-clear-pins').addEventListener('click', () => {
    preferencias.nodosConservados = []; actualizarFocal(); status('Ramas conservadas liberadas.');
  });
  function conservarNodo(id) {
    if (!indice.nodos.has(id) || estado.focos.includes(id)) return;
    const guardados = new Set(preferencias.nodosConservados);
    if (guardados.has(id)) guardados.delete(id);
    else {
      const prueba = incorporarConservados([], indice, estado.focos, [id], preferencias.nodosOcultos);
      if (prueba.sinCamino.length) { status('No existe camino disponible hacia el nodo con los filtros actuales.'); return; }
      guardados.add(id);
    }
    preferencias.nodosConservados = [...guardados]; actualizarFocal();
  }
  function ocultarNodo(id) {
    if (estado.focos.includes(id)) { status('Los focos no pueden ocultarse; quitá el foco si lo necesitás.'); return; }
    if (!indice.nodos.has(id) && !id.startsWith('grupo_faq:')) return;
    preferencias.nodosOcultos = [...new Set([...preferencias.nodosOcultos, id])];
    actualizarFocal(); inspeccionar(null);
  }

  $('#gv-default-foci').addEventListener('click', () => seleccionarFocos(predeterminados));
  $('#gv-foci').addEventListener('click', e => {
    const b = e.target.closest('[data-gv-remove]');
    if (b && estado.focos.length > 1) {
      const nombre = etiqueta(b.dataset.gvRemove);
      seleccionarFocos(estado.focos.filter(id => id !== b.dataset.gvRemove));
      notificador.mostrar(`Foco «${nombre}» eliminado`);
    }
  });
  function presentarResultados(matches) {
    $('#gv-matches').innerHTML = matches.map(n => `<div class="lab-graph-search-result"><span><strong>${esc(n.etiqueta)}</strong><small>${esc(n.uid)}</small></span>
      <button type="button" class="lab-btn lab-btn--ghost" data-gv-sole="${esc(n.uid)}">Foco único</button>
      <button type="button" class="lab-btn lab-btn--ghost" data-gv-add="${esc(n.uid)}">Añadir foco</button>
      <button type="button" class="lab-btn lab-btn--ghost" data-gv-search-pin="${esc(n.uid)}">Conservar rama</button></div>`).join('') || '<p class="hint">No se encontraron conceptos.</p>';
  }
  $('#gv-search-form').addEventListener('submit', e => {
    e.preventDefault();
    const vistos = new Set();
    const matches = ordenarBusquedaFocal(buscarNodosSemanticos(projection, $('#gv-search').value.trim(), 80))
      .filter(n => n.tipo !== 'parrafo' && n.tipo !== 'subunidad')
      .map(n => ({ ...n, uid: visualId(n.uid) }))
      .filter(n => { if (vistos.has(n.uid)) return false; vistos.add(n.uid); return true; })
      .slice(0, 15);
    presentarResultados(matches);
  });
  $('#gv-functional-search').addEventListener('click', () => {
    const q = $('#gv-search').value.trim().toLowerCase();
    const matches = projection.nodes.filter(n => n.tipo === 'nodo_funcional' &&
      (!q || `${n.etiqueta} ${n.uid} ${n.griego || ''}`.toLowerCase().includes(q)))
      .map(n => ({ ...n, uid: visualId(n.uid) })).slice(0, 25);
    presentarResultados(matches);
    status(`${matches.length} nodos funcionales encontrados en el catálogo (máximo 25).`);
  });
  function eventoFocos(e) {
    const pin = e.target.closest('[data-gv-search-pin]');
    if (pin && modo === 'focal') { conservarNodo(pin.dataset.gvSearchPin); return; }
    const uno = e.target.closest('[data-gv-sole]');
    const agregar = e.target.closest('[data-gv-add]');
    if (uno && indice.nodos.has(uno.dataset.gvSole)) seleccionarFocos([uno.dataset.gvSole]);
    if (agregar && indice.nodos.has(agregar.dataset.gvAdd)) {
      const id = agregar.dataset.gvAdd;
      if (estado.focos.includes(id)) { status('Ese nodo ya forma parte de los focos.'); return; }
      if (estado.focos.length >= 5) { status('Máximo cinco focos. Quitá uno antes de añadir otro.'); return; }
      const nombre = etiqueta(id);
      seleccionarFocos([...estado.focos, id]);
      notificador.mostrar(`Foco «${nombre}» agregado`);
    }
  }
  $('#gv-matches').addEventListener('click', eventoFocos);
  $('#gv-inspector').addEventListener('click', eventoFocos);
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => { if (!closed) void dibujar(); });
  else setTimeout(() => { if (!closed) void dibujar(); }, 0);
  return { el, destroy() { closed = true; ++generation; ++generacionTexto; cerrarExploradorTexto(); notificador.destruir(); viewer?.destruir(); viewer = null; } };
}
