// Contratos reales de la SPA contra Express. Sin credenciales, sin escrituras.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BASE_URL, PUBLIC_DIR, assertBundle, getBundle, ids, json, request } from './helpers.mjs';

test('API y MariaDB están disponibles (/api/health)', async () => {
  const health = await json('/api/health');
  assert.deepEqual(health, { ok: true, db: true });
});

test('Express entrega la SPA, módulos y CSS del refactor', async () => {
  for (const [uri, expected] of [
    ['/', /text\/html/i],
    ['/js/main.js', /javascript/i],
    ['/js/views/chat.js', /javascript/i],
    ['/js/views/landing.js', /javascript/i],
    ['/css/app.css', /text\/css/i],
    ['/css/views.css', /text\/css/i],
  ]) {
    const r = await request(uri);
    assert.equal(r.status, 200, `${uri}: HTTP ${r.status}`);
    assert.match(r.headers.get('content-type') || '', expected, `${uri}: Content-Type`);
    assert.ok((await r.text()).length > 30, `${uri}: recurso vacío`);
  }
});

test('GET /api/contenido expone un corpus consistente, sin cantidades fijas', async () => {
  const data = await getBundle();
  assertBundle(data);
  const refs = new Set(data.tags.unidades.flatMap(u => (u.subunidades || []).map(s => s.id)));
  assert.equal(refs.size, data.tags.unidades.reduce((sum, u) => sum + (u.subunidades?.length || 0), 0));
  const faqs = new Set(data.tags.faqs.map(f => f.id));
  for (const t of data.trayectos.trayectos) assert.ok(faqs.has(t.faq), `Trayecto sin FAQ: ${t.id}`);
});

test('La API de unidades y FAQ coincide con el bundle usado por el frontend', async () => {
  const [data, units, faqs] = await Promise.all([getBundle(), json('/api/unidades'), json('/api/faqs')]);
  assert.deepEqual(ids(units, 'GET /api/unidades'), ids(data.tags.unidades, 'bundle.unidades'));
  assert.deepEqual(ids(faqs, 'GET /api/faqs'), ids(data.tags.faqs, 'bundle.faqs'));
  for (const u of units) {
    const original = data.tags.unidades.find(x => x.id === u.id);
    assert.deepEqual(ids(u.subunidades, `${u.id}: API subunidades`), ids(original.subunidades, `${u.id}: bundle subunidades`));
  }
});

test('El frontend puede construir su Store, motor de Diálogo y biblioteca bilingüe desde la API', async () => {
  assert.ok(PUBLIC_DIR, 'No se encontró public/js/store.js: configurá PUBLIC_DIR');
  const data = await getBundle();
  const load = async file => import(pathToFileURL(path.join(PUBLIC_DIR, file)).href);
  const { buildStore } = await load('js/store.js');
  const { Bot } = await load('js/bot/bot.js');
  const { DIALOGO_CONFIG } = await load('js/bot/config.js');
  const { parseBook, buildLibrary } = await load('js/reader/text.js');
  const S = buildStore(data.tags, data);
  assert.equal(Object.keys(S.U).length, data.tags.unidades.length);
  assert.equal(Object.keys(S.FAQ).length, data.tags.faqs.length);
  const elegido = data.tags.faqs.find(f => data.trayectos.trayectos.some(t => t.faq === f.id)) || data.tags.faqs[0];
  const bot = new Bot(S, { config: DIALOGO_CONFIG });
  assert.ok(bot.greet().text);
  const messages = bot.onUserMessage(elegido.pregunta, { via: 'faq', faqId: elegido.id });
  assert.ok(Array.isArray(messages) && messages.length > 0, `La FAQ ${elegido.id} no produjo respuesta`);
  assert.ok(messages.every(m => typeof m.text === 'string'), 'El bot produjo mensajes sin texto');
  const text = await request('/api/texto/EN_libro1_v8.txt');
  assert.equal(text.status, 200);
  const raw = await text.text();
  assert.equal(text.headers.get('x-texto-sha256'), createHash('sha256').update(raw).digest('hex'));
  const book = parseBook(raw, { id: S.repo.libroTagueado() });
  assert.ok(book.chapters.length > 0, 'No hay capítulos');
  assert.ok(book.chapters.some(c => c.paragraphs.some(p => p.es && p.gr)), 'Falta texto en paralelo');
  const library = buildLibrary([book], S);
  assert.ok(library.books.length === 1 && library.passages && library.issues, 'Error construyendo biblioteca');
});

test('El laboratorio de corpus conserva la revisión entre endpoints', async () => {
  const inicio = await json('/api/labo/inicio');
  assert.match(inicio.revision, /^[a-f0-9]{64}$/i);
  assert.ok(inicio.corpus && inicio.constructor, 'Inicio incompleto');
  const rev = encodeURIComponent(inicio.revision);
  const lectura = await json(`/api/labo/lectura?revision=${rev}`);
  assert.equal(lectura.revision, inicio.revision);
  assert.ok(Array.isArray(lectura.graphIndex) && lectura.graphIndex.length > 0, 'Sin índice de grafos');
  const graphFile = lectura.graphIndex[0].file;
  assert.equal(typeof graphFile, 'string');
  const g = await json(`/api/labo/grafos/${encodeURIComponent(graphFile)}?revision=${rev}`);
  assert.equal(g.revision, inicio.revision);
  assert.equal(g.graph.file, graphFile);
  assert.ok(Array.isArray(g.datos?.NODES) && g.datos.NODES.length > 0);
  assert.ok(Array.isArray(g.datos?.EDGES));
  const search = await json('/api/labo/buscar', { method: 'POST', json: {
    revision: inicio.revision, modo: 'libre', query: 'bien', options: {},
  }});
  assert.equal(search.revision, inicio.revision);
  assert.ok(Array.isArray(search.results), 'La búsqueda no devolvió results[]');
});

test('Las rutas desconocidas devuelven 404 y una revisión incorrecta devuelve 409', async () => {
  const unknown = await request('/api/__no_existe_para_pruebas__');
  assert.equal(unknown.status, 404);
  const outdated = await request('/api/labo/lectura?revision=revision-invalida');
  assert.equal(outdated.status, 409);
});

// No modifica datos: comprueba que una ruta editorial nunca permite acceso anónimo.
test('La API rechaza escrituras editoriales sin autorización, sin modificar MariaDB', async () => {
  const res = await request('/api/faqs', { method: 'POST', json: { id: 'no-debe-crearse' } });
  assert.ok([401, 503].includes(res.status), `POST /api/faqs sin token: HTTP ${res.status}`);
  const payload = await res.json();
  assert.equal(typeof payload.error, 'string');
});
