import { parse } from './router.js';
import { loadConfig, loadInitial, saveConfig } from './store.js';
import * as searchView from './views/busqueda.js';
import * as historyView from './views/historial.js';
import * as configView from './views/config.js';
import * as courseView from './views/recorrido.js';
import * as zeroView from './views/fase-cero.js';
import * as streamView from './views/fase-cero-stream.js';
import * as pendingView from './views/pendiente.js';
import { esc } from './ui.js';
import { emptyBuilder } from './constructor.js';

const root = document.getElementById('app');
const app = {
  corpus: null,
  config: loadConfig(),
  queryModel: null,
  builderUndo: [],
  builderUI: { open: false, slot: 0, tab: 'temas', query: '', refineId: null, limit: 32 },
  search: { mode: 'builder', builder: emptyBuilder(), hasRun: false, plan: null, query: '', criteria: [], sources: ['paragraphs'], results: [], selected: new Set(), interactionId: null, evaluation: null },
  selector: { open: false, tab: 'functional', query: '' },
  sourcesPanelOpen: false,
  saveConfig() { this.config = saveConfig(this.config); return this.config; },
  setConfig(next) { this.config = saveConfig(next); return this.config; },
};

async function mount() {
  const route = parse();
  streamView.dispose();
  root.onclick=null;root.onsubmit=null;
  root.classList.remove('bot-view','zero-view','stream-view','stream-unified','stream-textual');
  if (route.section !== 'buscar') { app.builderUI.open = false; app.selector.open = false; root.classList.remove('guided-search'); }
  document.querySelectorAll('.nav a').forEach(a => {
    if (a.dataset.section === route.section) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  try {
    if (route.section === 'buscar') await searchView.render(root, app, route);
    else if (route.section === 'recorrido') await zeroView.render(root, app);
    else if (route.section === 'recorrido-stream') await streamView.render(root, app);
    else if (route.section === 'recorrido-anterior') await courseView.render(root, app);
    else if (route.section === 'historial') await historyView.render(root, app);
    else if (route.section === 'config') await configView.render(root, app);
    else if (route.section === 'grafos') pendingView.render(root, {
      step: 'Etapa F2',
      title: 'Navegación por grafos',
      text: 'Acá se incorporarán la activación conceptual, los trayectos y la comparación entre caminos dirigidos y no dirigidos.',
    });
    else if (route.section === 'agentes') pendingView.render(root, {
      step: 'Etapa final',
      title: 'Equipo de agentes',
      text: 'Los agentes propondrán revisiones y fuentes, pero nunca editarán el proyecto. Se implementarán después de afinar recuperación y bot.',
    });
    else location.replace('#/buscar');
    root.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (error) {
    console.error(error);
    root.innerHTML = `<div class="placeholder"><span class="step">Error</span><h1>No se pudo abrir esta sección</h1><p>${esc(error.message)}</p><a class="button" href="#/buscar">Volver a Búsqueda</a></div>`;
  }
}

(async () => {
  try {
    const initial = await loadInitial();
    app.corpus = initial.corpus; app.queryModel = initial.queryModel; app.revision = initial.revision;
    document.getElementById('corpus-status').textContent =
      `${app.corpus.version} · ${app.corpus.stats.fragments.toLocaleString('es-AR')} fragmentos`;
    if (!location.hash) history.replaceState(null, '', '#/buscar');
    window.addEventListener('hashchange', mount);
    await mount();
  } catch (error) {
    console.error(error);
    root.innerHTML = `<div class="placeholder"><span class="step">Sin datos</span><h1>No se pudo cargar el corpus</h1><p>${esc(error.message)} Revisá la conexión con el servidor y la base de datos.</p></div>`;
  }
})();
