import { normalize, SOURCE_GROUPS } from '../buscar.js';
import { remoteSearch } from '../store.js';
import { addInteraction, patchInteraction } from '../historial.js';
import { esc, tags, toast, voiceKey, voiceLabel } from '../ui.js';
import { emptyBuilder, cleanBuilder, validation, questionText } from '../constructor.js';
import * as builderView from './constructor.js';

const ISSUES = [
  ['irrelevante', 'Resultado irrelevante'],
  ['falta', 'Falta un resultado importante'],
  ['voz', 'Voz incorrecta o ambigua'],
  ['cita', 'Cita insuficiente'],
  ['trayecto', 'Trayecto poco valioso'],
  ['ruido', 'Exceso de ruido'],
  ['incompleta', 'Respuesta incompleta'],
  ['criterio', 'Criterio conceptual incorrecto'],
];
const GROUP_ORDER = ['textual', 'traduccion', 'comentarista', 'endoxa', 'nuestra', 'unstructured'];
const TYPE_LABELS = {
  functional_category: 'Categoría funcional', functional_node: 'Nodo / ancla funcional',
  static_concept: 'Concepto estático', static_sense: 'Sentido específico',
  functional_edge: 'Arista funcional', graph_edge: 'Arista de grafo',
};

export async function render(root, app, route) {
  const routeQuery = route.query.get('q');
  const routeScope = route.query.get('scope');
  const routeCriteria = route.query.get('c');
  const routeSources = route.query.get('src');
  const routeSelector = route.query.get('selector');
  const routeBuilder = route.query.get('qb');
  const hasLegacy = routeQuery != null || routeCriteria != null || routeSelector != null;
  if (route.query.get('sources') === 'open') app.sourcesPanelOpen = true;
  if (routeScope) app.config.scope = routeScope === 'all' ? 'all' : 'en1';
  if (routeBuilder != null) {
    app.search.mode = 'builder';
    try { app.search.builder = cleanBuilder(JSON.parse(routeBuilder), app.corpus, app.queryModel); }
    catch { app.search.builder = emptyBuilder(); toast('No se pudo leer la consulta guiada. Elegí de nuevo los objetos.'); }
    app.search.criteria = app.search.builder.slots.filter(Boolean);
  } else if (hasLegacy || route.query.get('mode') === 'libre') {
    app.search.mode = 'lexical';
    if (hasLegacy) app.search.criteria = (routeCriteria || '').split(',').filter(id => app.corpus.criterionById.has(id)).slice(0, 3);
  }
  if (['functional', 'static', 'edges'].includes(routeSelector)) { app.selector.tab = routeSelector; app.selector.open = true; }
  if (routeSources != null || routeBuilder != null || hasLegacy) {
    app.search.sources = (routeSources || 'paragraphs').split(',').filter(id => SOURCE_GROUPS[id]);
    if (!app.search.sources.length) app.search.sources = ['paragraphs'];
  }
  if (routeBuilder != null || hasLegacy || routeSources != null) await perform(app, routeQuery ?? '', false);
  const guided = app.search.mode === 'builder';
  root.classList.toggle('guided-search', guided);
  const complete = !guided || validation(app.search.builder, app.corpus, app.queryModel).complete;

  root.innerHTML = `
    <div class="page-head"><div>
      <div class="eyebrow">Etapa F1.3 · constructor de consultas</div>
      <h1>Buscar antes de responder</h1>
      <p>Elegí un objeto y una intención para orientar la recuperación. Por defecto se muestran solo párrafos; todavía no se genera una respuesta.</p><p>Las búsquedas se procesan en el servidor; el historial y las evaluaciones se guardan en este navegador.</p>
    </div></div>
    <div class="search-modes" aria-label="Modo de búsqueda"><button type="button" data-search-mode="builder" aria-pressed="${guided}">Constructor guiado</button><button type="button" data-search-mode="lexical" aria-pressed="${!guided}">Búsqueda libre y criterios</button></div>
    <form class="search-panel" id="search-form">
      ${guided ? builderView.panel(app) : ''}
      <div class="search-row${guided ? ' qb-submit-row' : ''}">
        ${guided ? '<span class="qb-submit-help">La consulta orienta qué recuperar; los filtros delimitan dónde buscar.</span>' : `
        <input class="search-input" id="query" name="q" type="search" autocomplete="off" value="${esc(app.search.query)}" placeholder="Pregunta opcional: ¿por qué la felicidad es una actividad?" aria-label="Consulta libre">`}
        <select id="scope" name="scope" aria-label="Alcance">
          <option value="en1"${app.config.scope === 'en1' ? ' selected' : ''}>EN libro I</option>
          <option value="all"${app.config.scope === 'all' ? ' selected' : ''}>Todo el material</option>
        </select>
        <button class="primary" type="submit"${complete ? '' : ' disabled'}>${guided ? 'Recuperar material' : 'Buscar'}</button>
      </div>
      ${guided ? '' : criteriaPanel(app)}
      ${sourcesPanel(app)}
      <div class="search-meta">
        <span class="mode">${guided ? 'Guiada · F1.3' : app.search.criteria.length ? 'Estructurada · F1.2' : 'Léxica · F1'}</span>
        <span>${app.corpus.stats.en1.toLocaleString('es-AR')} fragmentos en EN I · ${app.corpus.stats.fragments.toLocaleString('es-AR')} totales</span>
        <label><input id="include-unstructured" type="checkbox"${app.config.includeUnstructured ? ' checked' : ''}> Admitir voz no estructurada</label>
      </div>
    </form>
    ${app.search.error ? `<p class="warning-line" role="alert">${esc(app.search.error)}</p>` : ''}
    ${guided ? builderView.plan(app) : ''}
    ${workspace(app)}
    ${guided ? builderView.dialog(app) : selectorDialog(app)}
  `;
  bind(root, app, route);
  if (!guided && app.selector.open) root.querySelector('#criterion-dialog')?.showModal();
  if (guided && app.builderUI.open) root.querySelector('#qb-dialog')?.showModal();
}

function bind(root, app, route) {
  const rerender = () => render(root, app, { section: 'buscar', query: new URLSearchParams() });
  if (app.search.mode === 'builder') builderView.bind(root, app, { rerender, perform });
  root.querySelectorAll('[data-search-mode]').forEach(button => button.addEventListener('click', async () => {
    if (app.search.mode === button.dataset.searchMode) return;
    app.search.mode = button.dataset.searchMode;
    app.selector.open = false; app.builderUI.open = false;
    app.search.query = ''; app.search.results = []; app.search.selected = new Set(); app.search.interactionId = null; app.search.evaluation = null; app.search.plan = null; app.search.hasRun = false; app.search.error = '';
    app.search.criteria = app.search.mode === 'builder' ? app.search.builder.slots.filter(Boolean) : [];
    history.replaceState(null, '', app.search.mode === 'builder' ? '#/buscar' : '#/buscar?mode=libre');
    await rerender();
  }));
  root.querySelector('#search-form').addEventListener('submit', async event => {
    event.preventDefault();
    app.config.scope = root.querySelector('#scope').value;
    app.config.includeUnstructured = root.querySelector('#include-unstructured').checked;
    app.saveConfig();
    const query = app.search.mode === 'builder' ? questionText(app.search.builder, app.corpus, app.queryModel) : root.querySelector('#query').value;
    if (app.search.mode === 'builder' && !validation(app.search.builder, app.corpus, app.queryModel).complete) { toast('Completá o ajustá la consulta guiada.'); return; }
    if (!query.trim() && !app.search.criteria.length) { toast('Escribí una consulta o seleccioná al menos un criterio.'); return; }
    if (!await perform(app, query, true)) { await rerender(); return; }
    history.replaceState(null, '', searchUrl(app));
    await render(root, app, { section: 'buscar', query: new URLSearchParams() });
  });
  root.querySelector('#scope').addEventListener('change', async event => { app.config.scope = event.target.value; app.saveConfig(); if (app.search.hasRun) await perform(app, app.search.query, false); await rerender(); });
  root.querySelector('#include-unstructured').addEventListener('change', async event => {
    app.config.includeUnstructured = event.target.checked;
    app.saveConfig();
    await perform(app, app.search.query, false);
    await rerender();
  });
  const sourceDetails = root.querySelector('#source-details');
  sourceDetails?.addEventListener('toggle', () => { app.sourcesPanelOpen = sourceDetails.open; });
  root.querySelectorAll('[data-source-group]').forEach(input => input.addEventListener('change', async event => {
    const id = event.target.dataset.sourceGroup;
    if (event.target.checked) app.search.sources = [...new Set([...app.search.sources, id])];
    else {
      if (app.search.sources.length === 1) { event.target.checked = true; toast('Tiene que quedar al menos una fuente activa.'); return; }
      app.search.sources = app.search.sources.filter(x => x !== id);
    }
    app.sourcesPanelOpen = true;
    await perform(app, app.search.query, false);
    await rerender();
  }));
  root.querySelector('#reset-sources')?.addEventListener('click', async () => {
    app.search.sources = ['paragraphs'];
    app.sourcesPanelOpen = false;
    await perform(app, app.search.query, false);
    await rerender();
  });
  root.querySelector('#open-selector')?.addEventListener('click', async () => { app.selector.open = true; await rerender(); });
  root.querySelectorAll('[data-remove-criterion]').forEach(button => button.addEventListener('click', async () => {
    app.search.criteria = app.search.criteria.filter(id => id !== button.dataset.removeCriterion);
    await perform(app, app.search.query, false); await rerender();
  }));
  const dialog = root.querySelector('#criterion-dialog');
  dialog?.addEventListener('cancel', () => { app.selector.open = false; });
  dialog?.addEventListener('close', () => { app.selector.open = false; });
  root.querySelector('#close-selector')?.addEventListener('click', () => { app.selector.open = false; dialog.close(); });
  root.querySelectorAll('[data-selector-tab]').forEach(button => button.addEventListener('click', async () => {
    app.selector.tab = button.dataset.selectorTab; app.selector.open = true; await rerender();
  }));
  root.querySelector('#selector-filter-form')?.addEventListener('submit', async event => {
    event.preventDefault(); app.selector.query = String(new FormData(event.currentTarget).get('selectorQuery') || '').trim();
    app.selector.open = true; await rerender();
  });
  root.querySelectorAll('[data-add-criterion]').forEach(button => button.addEventListener('click', async () => {
    const id = button.dataset.addCriterion;
    if (app.search.criteria.includes(id) || app.search.criteria.length >= 3) return;
    const criterion = app.corpus.criterionById.get(id);
    if (criterion?.voiceStatus === 'no_estructurada' && !app.config.includeUnstructured) return;
    app.search.criteria.push(id); app.selector.open = app.search.criteria.length < 3;
    await perform(app, app.search.query, false); await rerender();
  }));
  root.querySelectorAll('[data-pick]').forEach(input => input.addEventListener('change', async event => {
    const id = event.target.dataset.pick;
    if (event.target.checked) app.search.selected.add(id); else app.search.selected.delete(id);
    if (app.search.interactionId) await patchInteraction(app.search.interactionId, { selectedIds: [...app.search.selected] });
    await rerender();
  }));
  const evalForm = root.querySelector('#evaluation-form');
  if (evalForm) evalForm.addEventListener('submit', async event => {
    event.preventDefault(); const form = new FormData(evalForm); const rating = form.get('rating');
    if (!rating) { toast('Elegí una evaluación general.'); return; }
    if (!app.search.interactionId) app.search.interactionId = await saveCurrent(app);
    await patchInteraction(app.search.interactionId, { selectedIds: [...app.search.selected], evaluation: {
      rating, issues: form.getAll('issues'), comment: String(form.get('comment') || '').trim(), evaluatedAt: new Date().toISOString(),
    }});
    app.search.evaluation = { rating, issues: form.getAll('issues'), comment: String(form.get('comment') || '').trim() };
    toast('Evaluación guardada.');
  });
}

async function perform(app, query, save) {
  const serial = app.search.requestSeq = (app.search.requestSeq || 0) + 1;
  const guided = app.search.mode === 'builder';
  const requested = guided
    ? { modo:'guiada', builder:structuredClone(app.search.builder), options:{...app.config,sources:[...app.search.sources]} }
    : { modo:'libre', query:String(query || '').trim(), options:{...app.config,criteria:[...app.search.criteria],sources:[...app.search.sources]} };
  const fingerprint = () => JSON.stringify({mode:app.search.mode,builder:app.search.builder,criteria:app.search.criteria,sources:app.search.sources,config:app.config});
  const atRequest = fingerprint();
  const stillCurrent = () => serial === app.search.requestSeq && fingerprint() === atRequest;
  try {
    const response = await remoteSearch(app.revision, requested);
    if (!stillCurrent()) return false;
    app.search.error = '';
    if (guided) {
      app.search.criteria = app.search.builder.slots.filter(Boolean);
      app.search.results = response.results; app.search.plan = response.plan;
      app.search.hasRun = response.plan.valid.complete;
      app.search.query = app.search.hasRun ? questionText(app.search.builder, app.corpus, app.queryModel) : '';
    } else {
      app.search.query = requested.query; app.search.results = response.results;
      app.search.plan = null; app.search.hasRun = Boolean(app.search.query || app.search.criteria.length);
    }
    for (const result of app.search.results) {
      app.corpus.byId.set(result.item.id, result.item);
      for (const part of result.item.parts || []) app.corpus.byId.set(part.id, part);
    }
    app.search.selected = new Set(app.search.results.filter(x => x.item.role === 'evidencia' && (x.item.voiceStatus === 'estructurada' || app.config.includeUnstructured)).slice(0, 8).map(x => x.item.id));
    app.search.interactionId = null; app.search.evaluation = null;
    if (save && app.search.hasRun) app.search.interactionId = await saveCurrent(app);
    if (app.search.hasRun) history.replaceState(null, '', searchUrl(app));
    return true;
  } catch (error) {
    if (!stillCurrent()) return false;
    if (!guided) app.search.query = requested.query; // conservar lo escrito si la consulta falla
    app.search.error = error.message || 'No se pudo consultar el servidor.';
    app.search.results = []; app.search.plan = null; app.search.hasRun = false;
    app.search.selected = new Set(); app.search.interactionId = null;
    toast(app.search.error);
    return false;
  }
}

function saveCurrent(app) {
  const criteria = app.search.criteria.map(id => { const x = app.corpus.criterionById.get(id); return { id, type: x?.type, label: x?.label }; });
  return addInteraction({
    schemaVersion: 2, type: app.search.mode === 'builder' ? 'consulta_guiada' : criteria.length ? 'busqueda_estructurada' : 'busqueda_lexica',
    builder: app.search.mode === 'builder' ? JSON.parse(JSON.stringify(app.search.builder)) : null,
    builderModel: app.search.mode === 'builder' ? { version: app.queryModel.version, contentHash: app.queryModel.contentHash } : null,
    recoveryPlan: app.search.plan ? { exactFaqIds: app.search.plan.faqs.filter(x => x.kind === 'exacta').map(x => x.faq.id), edgeIds: app.search.plan.edges.map(x => x.edge.id) } : null,
    query: app.search.query, criteria,
    sources: [...app.search.sources],
    config: { ...app.config }, corpus: { version: app.corpus.version, contentHash: app.corpus.contentHash },
    results: app.search.results.map(x => ({ id: x.item.id, score: x.score, title: x.item.title, source: x.item.source, voices: x.item.voices, voiceStatus: x.item.voiceStatus, ref: x.item.ref, matches: x.matches })),
    selectedIds: [...app.search.selected],
  });
}

function searchUrl(app) {
  const q = new URLSearchParams();
  if (app.search.mode === 'builder') q.set('qb', JSON.stringify(app.search.builder));
  else q.set('mode', 'libre');
  if (app.search.mode !== 'builder' && app.search.query) q.set('q', app.search.query); q.set('scope', app.config.scope);
  if (app.search.mode !== 'builder' && app.search.criteria.length) q.set('c', app.search.criteria.join(','));
  q.set('src', app.search.sources.join(','));
  return `#/buscar?${q}`;
}

function criteriaPanel(app) {
  const selected = app.search.criteria.map(id => app.corpus.criterionById.get(id)).filter(Boolean);
  return `<div class="criteria-panel">
    <div class="criteria-head"><div><strong>Criterios conceptuales</strong><span>${selected.length}/3 selecciones</span></div>
      <button id="open-selector" type="button"${selected.length >= 3 ? ' disabled' : ''}>${selected.length ? 'Añadir otro' : 'Seleccionar'}</button></div>
    <div class="criterion-chips">${selected.length ? selected.map(x => `<div class="criterion-chip">
      <span class="criterion-kind">${esc(TYPE_LABELS[x.type] || x.type)}</span><strong>${esc(x.label)}</strong>${x.greek ? `<span lang="gr">${esc(x.greek)}</span>` : ''}
      <button type="button" data-remove-criterion="${esc(x.id)}" aria-label="Quitar ${esc(x.label)}">×</button></div>`).join('')
      : '<span class="criteria-empty">Sin criterios: se usará solamente la búsqueda léxica.</span>'}</div>
  </div>`;
}

function sourcesPanel(app) {
  const active = app.search.sources.map(id => SOURCE_GROUPS[id]?.label).filter(Boolean);
  const summary = active.length === 1
    ? `${active[0]} · 1 fuente activa`
    : `${active.length} fuentes activas · ${active.slice(0, 2).join(' + ')}${active.length > 2 ? '…' : ''}`;
  return `<details class="sources-panel" id="source-details"${app.sourcesPanelOpen ? ' open' : ''}>
    <summary><span><strong>Fuentes de resultados</strong><small>${esc(summary)}</small></span><span class="sources-action">Agregar fuentes</span></summary>
    <div class="source-options">
      ${Object.entries(SOURCE_GROUPS).map(([id, x]) => `<label class="source-option">
        <input type="checkbox" data-source-group="${id}"${app.search.sources.includes(id) ? ' checked' : ''}>
        <span><strong>${esc(x.label)}</strong><small>${esc(x.description)}</small></span>
      </label>`).join('')}
    </div>
    <div class="sources-foot">
      <span>Los filtros se aplican antes del límite y del ranking.</span>
      <button id="reset-sources" type="button"${app.search.sources.length === 1 && app.search.sources[0] === 'paragraphs' ? ' disabled' : ''}>Restablecer: solo párrafos</button>
    </div>
  </details>`;
}

function selectorDialog(app) {
  const tabs = [['functional', 'Funcional'], ['static', 'Conceptos y sentidos'], ['edges', 'Aristas']]; const items = selectorItems(app);
  return `<dialog class="criterion-dialog" id="criterion-dialog" aria-labelledby="selector-title">
    <div class="dialog-head"><div><span class="eyebrow">Máximo tres selecciones</span><h2 id="selector-title">Añadir criterio</h2></div><button id="close-selector" type="button">Cerrar</button></div>
    <div class="selector-tabs" role="tablist">${tabs.map(([id, label]) => `<button type="button" role="tab" data-selector-tab="${id}" aria-selected="${app.selector.tab === id}">${label}</button>`).join('')}</div>
    <form id="selector-filter-form" class="selector-filter"><input name="selectorQuery" type="search" value="${esc(app.selector.query)}" placeholder="Filtrar por nombre, griego, relación o cita…"><button type="submit">Filtrar</button></form>
    <p class="selector-help">${selectorHelp(app.selector.tab)}</p>
    <div class="selector-list">${items.length ? items.map(x => selectorRow(app, x)).join('') : '<div class="empty">No hay coincidencias en esta sección.</div>'}</div>
  </dialog>`;
}

function selectorItems(app) {
  const all = app.corpus.catalog.criteria; let items;
  if (app.selector.tab === 'functional') items = hierarchical(all.filter(x => x.type === 'functional_category' || x.type === 'functional_node'));
  else if (app.selector.tab === 'static') items = hierarchical(all.filter(x => x.type === 'static_concept' || x.type === 'static_sense'));
  else items = all.filter(x => x.type === 'functional_edge' || x.type === 'graph_edge').sort((a, b) => a.type.localeCompare(b.type) || a.label.localeCompare(b.label, 'es'));
  const q = normalize(app.selector.query);
  return q ? items.filter(x => normalize(`${x.label} ${x.greek || ''} ${x.relation || ''} ${x.ref || ''} ${x.graph || ''}`).includes(q)) : items;
}

function hierarchical(items) {
  const ids = new Set(items.map(x => x.id)); const children = new Map();
  items.forEach(x => { const parent = ids.has(x.parentId) ? x.parentId : null; if (!children.has(parent)) children.set(parent, []); children.get(parent).push(x); });
  children.forEach(xs => xs.sort((a, b) => a.label.localeCompare(b.label, 'es'))); const out = [];
  const walk = parent => (children.get(parent) || []).forEach(x => { out.push(x); walk(x.id); }); walk(null); return out;
}

function selectorRow(app, x) {
  const selected = app.search.criteria.includes(x.id), full = app.search.criteria.length >= 3;
  const experimental = x.voiceStatus === 'no_estructurada' && x.type === 'graph_edge';
  const disabled = selected || full || experimental && !app.config.includeUnstructured;
  const anchors = (x.anchors || []).map(a => app.corpus.criterionById.get(a.id)).filter(Boolean);
  return `<article class="selector-row" style="--depth:${Math.min(x.depth || 0, 6)}"><div class="selector-copy">
    <div class="selector-label"><span class="tag">${esc(TYPE_LABELS[x.type] || x.type)}</span>${x.graph ? `<span class="tag source">${esc(x.graph)}</span>` : ''}${experimental ? '<span class="tag unstructured">experimental</span>' : ''}</div>
    <strong>${esc(x.label)}</strong>${x.greek ? ` <span class="greek" lang="gr">${esc(x.greek)}</span>` : ''}
    <small>${[x.relation && `relación: ${x.relation}`, x.ref].filter(Boolean).map(esc).join(' · ')}</small>
    ${anchors.length ? `<div class="anchor-links"><span>Anclas:</span>${anchors.map(a => `<button type="button" data-add-criterion="${esc(a.id)}"${app.search.criteria.includes(a.id) || full ? ' disabled' : ''}>${esc(a.label)}</button>`).join('')}</div>` : ''}
    </div><button class="add-criterion" type="button" data-add-criterion="${esc(x.id)}"${disabled ? ' disabled' : ''}>${selected ? 'Añadido' : 'Añadir'}</button></article>`;
}

function selectorHelp(tab) {
  if (tab === 'functional') return 'Seleccionar una categoría o subcategoría incluye sus descendientes con peso decreciente.';
  if (tab === 'static') return 'Podés elegir un concepto, un sentido exacto o una de sus anclas funcionales.';
  return 'Las 74 aristas funcionales están disponibles. Las aristas de grafos sin voz requieren habilitar el modo experimental.';
}

function workspace(app) {
  const searched = app.search.mode === 'builder' ? app.search.hasRun : Boolean(app.search.query || app.search.criteria.length), results = app.search.results;
  return `<div class="workspace"><section aria-labelledby="results-title"><div class="column-head"><h2 id="results-title">Resultados</h2><span class="count">${searched ? `${results.length} mostrados` : 'Esperando una consulta'}</span></div>
    <div class="results">${!searched ? '<div class="empty">Construí una consulta guiada o usá la búsqueda libre. Los cambios de objetos limpian los resultados anteriores hasta volver a recuperar material.</div>' : !results.length ? '<div class="empty">No se recuperaron coincidencias con estas fuentes y este alcance. Esto no demuestra que la relación no exista. Probá precisar el sentido o ampliar los filtros explícitamente.</div>' : resultGroups(results, app)}</div></section>
    <aside aria-labelledby="dossier-title"><div class="column-head"><h2 id="dossier-title">Dossier de evidencia</h2><span class="count">${app.search.selected.size} seleccionados</span></div>
    <div class="dossier">${dossier(app)}${searched ? evaluation(app.search.evaluation) : ''}</div></aside></div>`;
}

function resultGroups(results, app) {
  let last = null, html = '';
  if (app.search.mode === 'builder') return results.map((x, i) => resultCard(x, app.search.selected.has(x.item.id), app.config.includeUnstructured, i, app.search.criteria.length)).join('');
  results.forEach((x, i) => { if (app.search.criteria.length > 1 && x.crossing !== last) { html += `<div class="result-group-label">${x.crossing > 1 ? `Cruces · ${x.crossing} de ${app.search.criteria.length} criterios` : 'Resultados de un criterio'}</div>`; last = x.crossing; } html += resultCard(x, app.search.selected.has(x.item.id), app.config.includeUnstructured, i, app.search.criteria.length); });
  return html;
}

function resultCard(result, selected, includeUnstructured, index, criteriaCount) {
  const x = result.item, disabled = x.voiceStatus !== 'estructurada' && !includeUnstructured;
  const paragraph = x.kind === 'paragraph_group';
  const gr = paragraph ? x.parts?.find(p => p.language === 'gr') : null;
  return `<article class="result-card"><div class="result-top"><div class="tags">${tags(x)}${x.role !== 'evidencia' ? `<span class="tag">${esc(x.role)}</span>` : ''}${criteriaCount ? `<span class="tag cross">${result.crossing}/${criteriaCount} criterios</span>` : ''}</div><div class="score">#${index + 1}<br>${result.score} pts.</div></div>
    <h3>${esc(x.title)}${paragraph && x.ref ? ` <span class="paragraph-ref">${esc(x.ref)}</span>` : ''}</h3>
    <p class="snippet">${esc(result.snippet)}</p>
    ${gr ? `<details class="greek-text"><summary>Ver griego</summary><p lang="gr">${esc(gr.text)}</p></details>` : ''}
    <div class="reasons">${result.reasons.map(esc).join('<br>')}</div>
    <div class="result-actions">${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">Abrir fuente</a>` : '<span></span>'}<label class="pick" title="${disabled ? 'Activá la inclusión de voces no estructuradas para usarla en el dossier.' : ''}"><input type="checkbox" data-pick="${esc(x.id)}"${selected ? ' checked' : ''}${disabled ? ' disabled' : ''}> En dossier</label></div></article>`;
}

function dossier(app) {
  const current = new Map(app.search.results.map(x => [x.item.id, x.item]));
  const selected = [...app.search.selected]
    .map(id => current.get(id) || app.corpus.byId.get(id))
    .filter(Boolean)
    .flatMap(x => x.parts?.length ? x.parts : [x]);
  if (!selected.length) return '<div class="empty">Seleccioná resultados para ordenar la evidencia por voces.</div>';
  const groups = new Map(); selected.forEach(x => { const key = voiceKey(x); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(x); });
  const keys = [...groups.keys()].sort((a, b) => { const ai = GROUP_ORDER.indexOf(a), bi = GROUP_ORDER.indexOf(b); return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi); });
  return `<div class="dossier-groups">${keys.map(key => `<section class="dossier-group"><div class="dossier-title"><h3>${esc(voiceLabel(key))}</h3><span>${groups.get(key).length}</span></div>${groups.get(key).map(x => evidence(x, app.search.mode === 'builder' ? app.search.builder.depth : 'normal')).join('')}${key === 'unstructured' ? '<div class="warning-line">Material experimental: todavía no se asignó su voz caso por caso.</div>' : ''}</section>`).join('')}</div>`;
}
function evidence(x, depth = 'normal') { const length = depth === 'breve' ? 300 : depth === 'ampliada' ? 1600 : 520; return `<article class="evidence"><h4>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : esc(x.title)}</h4><p>${esc(x.text.length > length ? `${x.text.slice(0, length - 2)}…` : x.text)}</p>${x.ref ? `<span class="citation">${esc(x.ref)}</span>` : ''}</article>`; }
function evaluation(current) {
  const checked = key => current?.rating === key ? ' checked' : '';
  return `<form class="evaluation" id="evaluation-form"><h3>Evaluar esta recuperación</h3><p>La evaluación guarda la pregunta, los criterios estructurados y los resultados.</p><div class="rating"><label><input type="radio" name="rating" value="acertado"${checked('acertado')}>Acertado</label><label><input type="radio" name="rating" value="parcial"${checked('parcial')}>Parcial</label><label><input type="radio" name="rating" value="desacertado"${checked('desacertado')}>Desacertado</label></div><div class="issues">${ISSUES.map(([value, label]) => `<label><input type="checkbox" name="issues" value="${value}"${current?.issues?.includes(value) ? ' checked' : ''}>${label}</label>`).join('')}</div><textarea name="comment" placeholder="Qué faltó, qué sobró o qué criterio habría que corregir…">${esc(current?.comment || '')}</textarea><div class="eval-actions"><button class="primary" type="submit">Guardar evaluación</button></div></form>`;
}
