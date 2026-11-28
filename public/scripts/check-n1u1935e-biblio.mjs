import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { BIBLIOGRAPHY_GROUPS, createLabBibliographyView } from '../js/views/labBibliographyView.js';
const items = BIBLIOGRAPHY_GROUPS.flatMap(g => g.items);
test('dos autores y diez accesos distintos, locales y con procedencia', () => {
  assert.equal(BIBLIOGRAPHY_GROUPS.length, 2);
  assert.equal(items.length, 10);
  assert.equal(new Set(items.map(x=>x.href)).size, items.length);
  for (const i of items) { assert.ok(i.href.startsWith('/grafos/textos/')); assert.ok(i.tag && i.title && i.action); }
});
test('catálogo renderizado: retorno, enlaces y separación editorial', () => {
  const original = globalThis.document;
  try {
    globalThis.document = {createElement:()=>({})};
    const {el} = createLabBibliographyView();
    assert.ok(el.innerHTML.includes('href="#/lab"'));
    assert.ok(el.innerHTML.includes('no equivalen a afirmaciones textuales'));
    assert.equal((el.innerHTML.match(/class="card card--catalog-link/g)||[]).length,10);
  } finally { if(original===undefined) delete globalThis.document; else globalThis.document=original; }
});
test('destinos del catálogo existen en el repositorio', () => {
  for(const i of items) {
    const u = new URL(i.href, 'https://example.invalid');
    assert.ok(existsSync(new URL('..'+u.pathname,import.meta.url)),i.href);
    if (u.searchParams.has('t')) assert.ok(existsSync(new URL('../grafos/textos/js/data/'+u.searchParams.get('t')+'.json',import.meta.url)));
  }
});
test('registro y ruta de Laboratorio', () => {
  const s=readFileSync(new URL('../js/views/lab.js',import.meta.url),'utf8');
  assert.match(s,/bibliografia:\s*\{/);
  assert.match(s,/if \(opts\.exp === 'bibliografia'\) return createLabBibliographyView\(\)/);
});
