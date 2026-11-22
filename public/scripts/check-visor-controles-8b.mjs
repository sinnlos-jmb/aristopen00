// Checkpoint 8B: contrato del panel compacto y toasts no invasivos.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { crearNotificadorGrafo } from '../js/lab/graphUiFeedback.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const view = readFileSync(path.join(dir, '../js/views/labGraphPilotView.js'), 'utf8');
const css = readFileSync(path.join(dir, '../css/lab-graph-controls-8b.css'), 'utf8');
const cuenta = (s, x) => (s.match(new RegExp(x, 'g')) || []).length;
const ids = ['gv-controls-toggle', 'gv-controls-panel', 'gv-controls-close', 'gv-toasts',
  'gv-pane-nodos', 'gv-pane-aristas', 'gv-pane-vista', 'gv-parrafos', 'gv-edge-labels',
  'gv-save-layout', 'gv-reset-layout', 'gv-restore-nodes', 'gv-clear-pins',
  'gv-collapse-all', 'gv-default-foci', 'gv-filter-status', 'gv-hidden-items'];
for (const id of ids) assert.equal(cuenta(view, `id="${id}"`), 1, `ID único para ${id}`);
for (const name of ['nodos', 'aristas', 'vista']) {
  assert.match(view, new RegExp(`data-gv-tab="${name}"`));
  assert.match(view, new RegExp(`data-gv-pane="${name}"`));
}
assert.match(view, /aria-modal="false"/); // el grafo nunca queda bloqueado
assert.match(view, /aria-expanded="false"/);
assert.match(view, /\['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/);
assert.match(view, /e\.key === 'Escape'/);
assert.match(view, /!focal && !panel\.hidden/);
assert.match(view, /notificador\.destruir\(\)/);
assert.equal(cuenta(view, 'notificador\\.mostrar\\('), 3, 'solo guardar, añadir, quitar foco');
assert.match(css, /lab-graph-controls-popup\[hidden\]/);
assert.match(css, /lab-graph-controls-pane\[hidden\]/);
assert.match(css, /max-height:/);

// Prueba conductual del notificador sin dependencias de browser ni reloj real.
const eventos = [];
const timers = new Map();
let nextTimer = 0;
const container = {
  items: [],
  ownerDocument: { createElement: () => ({ attributes: {}, setAttribute(k, v) { this.attributes[k] = v; } }) },
  replaceChildren() { this.items = []; eventos.push('limpiar'); },
  append(n) { this.items.push(n); eventos.push('mostrar'); },
};
const notificador = crearNotificadorGrafo(container, {
  programar(fn, ms) { assert.equal(ms, 2800); timers.set(++nextTimer, fn); return nextTimer; },
  cancelar(id) { timers.delete(id); },
});
notificador.mostrar('Foco «Areté» agregado');
assert.equal(container.items.length, 1);
assert.equal(container.items[0].textContent, 'Foco «Areté» agregado');
assert.equal(container.items[0].attributes.role, 'status');
notificador.mostrar('Disposición guardada');
assert.equal(container.items.length, 1, 'no se apilan toasts');
assert.equal(container.items[0].textContent, 'Disposición guardada');
assert.equal(timers.size, 1, 'no se acumulan temporizadores');
const [pendienteId, pendienteFn] = [...timers.entries()][0];
timers.delete(pendienteId); pendienteFn();
assert.equal(container.items.length, 0, 'desaparece sin intervención');
notificador.mostrar('Fallo al guardar', { error: true });
assert.equal(container.items[0].attributes.role, 'alert');
assert.match(container.items[0].className, /--error/);
notificador.destruir();
assert.equal(timers.size, 0, 'destruir limpia el temporizador');
assert.equal(container.items.length, 0);
notificador.mostrar('No debe mostrarse');
assert.equal(container.items.length, 0);
console.log('OK: panel flotante con tres pestañas, IDs existentes, cierre accesible y toasts limitados a operaciones confirmadas.');
