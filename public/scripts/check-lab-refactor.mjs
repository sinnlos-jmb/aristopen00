// Chequeo de módulos extraídos; independiente de MariaDB, browser y modelo editorial.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderTrajectoriesView } from '../js/views/labTrajectoriesView.js';
import { renderAuditView } from '../js/views/labAuditView.js';

assert.equal(typeof renderAuditView, 'function');
const bestByFaq = new Map([['anterior', { path: [] }]]);
const fallback = renderTrajectoriesView({ S: null }, () => {
  throw new Error('No debe consultar trayectorias sin store');
}, bestByFaq);
assert.match(fallback, /Cargando datos/);
assert.equal(bestByFaq.size, 0, 'El cambio de tab limpia los resultados anteriores');
const mainSource = readFileSync(new URL('../js/views/lab.js', import.meta.url), 'utf8');
assert.match(mainSource, /renderTrajectoriesView\(App, getTrajectories, bestByFaq\)/);
assert.match(mainSource, /renderAuditView\(S, getTrajectories/);
console.log('OK: separación del Laboratorio y fallback de trayectorias.');
