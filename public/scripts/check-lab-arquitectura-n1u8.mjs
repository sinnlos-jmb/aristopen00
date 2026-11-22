// N1-U.8 · Smoke checks de estado, marcado, datos, tamaño y selectores.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ZOOM_SENSITIVITY_ANTERIOR, ZOOM_SENSITIVITY_TRIPLE, ZOOM_SENSITIVITY_ACTUAL, opcionesModalFichasHtml } from '../js/lab/architectureUiControls.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const view = readFileSync(resolve(root, 'js/views/labArchitectureView.js'), 'utf8');
const css = readFileSync(resolve(root, 'css/lab-arquitectura-n1u2.css'), 'utf8');
const cards = readFileSync(resolve(root, 'js/lab/architectureCards.js'), 'utf8');
const fixture = JSON.parse(readFileSync(resolve(root, 'lab/n1u7-fichas-red-piloto.json'), 'utf8'));
assert.equal(ZOOM_SENSITIVITY_TRIPLE, ZOOM_SENSITIVITY_ANTERIOR * 3);
assert(Math.abs(ZOOM_SENSITIVITY_TRIPLE - .48) < 1e-12);
assert.equal(ZOOM_SENSITIVITY_ACTUAL, .60);
assert.match(view, /wheelSensitivity:\s*ZOOM_SENSITIVITY_ACTUAL/);
assert.match(view, /minZoom:\s*0\.22,\s*maxZoom:\s*2\.5/);
assert.match(view, /data-arch-picker-open/);
assert.match(view, /<dialog\s+class="arch-picker-dialog"/);
assert.match(view, /picker\.showModal\(\)/);
assert.match(view, /picker\.close\(\)/);
assert.match(view, /picker\.addEventListener\('close'/);
assert.match(view, /opcionesModalFichasHtml\(fichas\.fichas\)/);
assert.doesNotMatch(view, /nav\.innerHTML\s*=\s*`<span>Fichas y problemas/);
assert.match(view, /ultimoGrafo === posGroup/);
assert.match(view, /cy\.zoom\(vistaAnterior\.zoom\)/);
assert.match(view, /cy\.pan\(vistaAnterior\.pan\)/);
assert.match(view, /arch-legend-details/);
assert.match(view, /arch-footer"><summary>Fuentes y estado editorial/);
assert.match(css, /grid-template-columns:\s*minmax\(0, 2\.5fr\) minmax\(280px, \.9fr\)/);
assert.match(css, /\.arch-picker-dialog::backdrop/);
assert.match(css, /grid-auto-rows:\s*85px/);
assert.match(cards, /<details class="arch-ficha-intro">/);
assert.doesNotMatch(cards, /<details class="arch-ficha-intro" open>/);
const fichas = [
  { id: 'proemio', titulo: 'Proemio', tipo: 'proemio' },
  { id: 'faq.etica.intro', titulo: '¿Qué es la ética?', tipo: 'faq', fuente_editorial: { origen: 'registrado' } },
  ...fixture.fichas.map(f => ({...f, tipo: 'faq'}))
];
const options = opcionesModalFichasHtml(fichas);
assert.equal((options.match(/data-arch-card=/g) || []).length, fichas.length);
for (const f of fichas) assert(options.includes(`data-arch-card="${f.id}"`));
const escaped = opcionesModalFichasHtml([{id:'<abc>', titulo:'<script>&"', tipo:'faq'}]);
assert(!escaped.includes('<script>') && escaped.includes('&lt;script&gt;') && escaped.includes('&quot;'));
console.log('N1-U.8: OK · zoom 3×, selector modal, tarjetas homogéneas, grafo ampliado, encuadre conservado y escape HTML.');
