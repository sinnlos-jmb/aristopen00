import { createRouter } from './router.js';
import { initShell } from './shell.js';
import { buildStore } from './store.js';
import { Bot } from './bot/bot.js';
import { DIALOGO_CONFIG } from './bot/config.js';
import { buildGraph } from './bot/graph.js';
import { createLandingView } from './views/landing.js';
import { createChatView } from './views/chat.js';
import { esc } from './ui.js';
import { readSession } from './lab/session.js';
import { validateManual } from './lab/audit.js';
import { loadLibrary } from './reader/text.js';
import { createReadingView } from './views/reading.js';
import { createGraphCatalogView, createGraphView, GRAPHS } from './views/graphs.js';
import { createLabView, createLabCatalogView, EXPERIMENTS } from './views/lab.js';
import { createLabOrientadorView } from './views/labOrientadorView.js';

const App = {
  S: null,
  bot: null,
  _G: null,
  _library: null,
  getLibrary() {
    if (!this._library) this._library = loadLibrary(this.S).catch(error => { this._library = null; throw error; });
    return this._library;
  },
  getGraph() {
    if (!this._G) this._G = buildGraph(this.S);
    return this._G;
  },
  // Bot de la sección Diálogo: FAQ elegidas → dummy; texto libre → smart (bot/config.js).
  getBot() {
    if (!this.bot) this.bot = new Bot(this.S, { config: DIALOGO_CONFIG });
    return this.bot;
  },
  resetBot() {
    this.bot = null;
    this._G = null;
  },
};

// La base es la fuente de datos: no se utiliza una copia local ante errores.
async function loadFromApi() {
  const r = await fetch('/api/contenido', { cache: 'no-cache' });
  if (!r.ok) throw new Error(`La API de contenido no está disponible (${r.status})`);
  const b = await r.json();
  if (!b?.tags?.unidades || !b?.tags?.faqs || !b?.estatico || !b?.funcional)
    throw new Error('La API devolvió contenido incompleto');
  return b;
}

// Marco de la app: sidebar, tema, breadcrumbs, scroll dinámico (ver shell.js)
const shell = initShell();

const router = createRouter({
  routes: {
    '/':          () => createLandingView(App),
    '/chat':      () => createChatView(App),
    '/lab':       () => createLabCatalogView(),
    '/reading':   () => createReadingView(App),
    '/grafos':    () => createGraphCatalogView(),
    ...Object.fromEntries(Object.keys(GRAPHS).map(id => [`/grafos/${id}`, () => createGraphView(id)])),
    ...Object.fromEntries(Object.keys(EXPERIMENTS).map(id => [`/lab/${id}`, () => createLabView(App, { exp: id })])),
    '/lab/orientador': () => createLabOrientadorView(),
  },
  notFound: () => createLandingView(App),
  onChange: (path) => {
    // '/lab/motor' -> 'lab', '/grafos/x' -> 'grafos': coincide con data-nav del sidebar
    const key = path === '/' ? 'home' : path.replace(/^\//, '').split('/')[0];
    shell.setActiveNav(key);
    shell.refreshScrollables();
  },
});

(async () => {
  try {
    const data = await loadFromApi();
    App.S = buildStore(data.tags, {
      funcional: data.funcional,
      estatico: data.estatico,
      manual: data.manual,
      argumentos: data.argumentos,
      trayectos: data.trayectos,
    });
    const sessionManual = readSession('manual-active', null);
    const usaManualSesion = sessionManual && !validateManual(sessionManual, App.S).length;
    if (usaManualSesion) App.S.manual = sessionManual;
    document.getElementById('status').textContent = `Base de datos · ${data.tags.version || '—'}${usaManualSesion ? ' · manual de sesión' : ''}`;
    window.App = App;
    router.start();
  } catch (err) {
    // Falla inicial: se muestra dentro del marco, en #app
    document.getElementById('app').innerHTML =
      `<div class="empty">No se pudieron cargar los datos: ${esc(err.message)}.<br>
       Verificá que el servidor y su conexión con la base estén disponibles.</div>`;
  }
})();

