// Regression checks with Node only: no dev dependencies or external services.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const viewDir = new URL('../js/views/', import.meta.url);
const files = readdirSync(viewDir).filter(name => name.endsWith('.js'));
for (const filename of files) {
  const url = new URL(filename, viewDir);
  execFileSync(process.execPath, ['--check', url.pathname]);
  const source = readFileSync(url, 'utf8');
  assert.doesNotMatch(source, /\sstyle\s*=\s*["']/i, `Inline CSS in ${filename}`);
  assert.doesNotMatch(source, /<style(?:\s|>)/i, `Embedded CSS in ${filename}`);
}
assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /\/css\/views\.css/);

// A tiny factory-level smoke test that is independent of browser APIs.
globalThis.document = { createElement: () => ({ className: '', innerHTML: '', addEventListener() {} }) };
const { createGraphCatalogView, GRAPHS } = await import('../js/views/graphs.js');
const { createLabCatalogView, EXPERIMENTS } = await import('../js/views/lab.js');
const { createLandingView } = await import('../js/views/landing.js');
const { createReadingView } = await import('../js/views/reading.js');
const { renderCatalogCard } = await import('../js/views/shared.js');

const graphs = createGraphCatalogView();
const lab = createLabCatalogView();
const landing = createLandingView({ S: { repo: { getStats: () => ({
  ultimoPasaje: '<prueba>', ultimoBekker: '1094a1', totalConceptos: 53, totalFaqs: 4,
  trayectosPublicados: 1,
}) } } });
const reading = await createReadingView({ getLibrary: async () => ({
  books: [{ id: 'I', title: 'Libro de prueba', chapters: [{ number: 1, paragraphs: [] }] }],
}) });
const count = (s, needle) => s.split(needle).length - 1;
assert.equal(count(graphs.el.innerHTML, 'class="card card--catalog-link'), Object.keys(GRAPHS).length);
assert.equal(count(lab.el.innerHTML, 'class="card card--catalog-link'), Object.keys(EXPERIMENTS).length);
assert.ok(landing.el.innerHTML.includes('&lt;prueba&gt;'), 'Las métricas deben escapar HTML');
assert.ok(reading.el.innerHTML.includes('data-book="I" data-chapter="1"'));
assert.ok(renderCatalogCard({ href: '#/x', icon: 'A', title: '<script>', tag: 'X', desc: 'X', action: 'Abrir' })
  .includes('&lt;script&gt;'), 'Las cards deben escapar HTML');

console.log(`OK: ${files.length} módulos JS, catálogos, portada, lectura y sanitización básica.`);
console.log('Nota: estas pruebas no sustituyen una validación visual en el navegador con la API real.');
