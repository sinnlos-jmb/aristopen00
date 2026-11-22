// N1-U.13: comprueba el acceso público, el catálogo y la ausencia de duplicación.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { FICHAS_PUBLICAS } from '../js/lab/architecturePublicRoutes.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const main = read('js/main.js');
const nav = read('index.html');
const shell = read('js/shell.js');
const landing = read('js/views/landing.js');
const wrapper = read('js/views/fichas.js');
const editorial = JSON.parse(read('lab/n1u11-catalogo-explicativo.json'));
const ids = new Set(editorial.fichas.map(f=>f.id));
assert.equal(ids.size,7);
assert.equal(Object.keys(FICHAS_PUBLICAS).length,7);
for (const [slug, id] of Object.entries(FICHAS_PUBLICAS)) {
  assert(ids.has(id), `Ruta ${slug}: ficha inexistente ${id}`);
  assert(slug.length > 0);
}
assert(main.includes("'/fichas':"));
assert(main.includes("Object.entries(FICHAS_PUBLICAS)"));
assert(nav.includes('data-nav="fichas"'));
assert(shell.includes("fichas: 'Fichas'"));
assert(landing.includes('href="#/fichas"'));
assert(wrapper.includes('createLabArchitectureView(App)'));
assert(wrapper.includes('new MutationObserver(actualizarRuta)'));
assert(!wrapper.includes('fetch(')); // La vista pública nunca duplica carga de fuentes.
console.log('N1-U.13 OK: 7 rutas a fichas, entrada pública, catálogo original y motor compartido.');
