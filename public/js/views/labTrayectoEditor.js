// js/views/labTrayectoEditor.js
// Editor de trayectos por FAQ. Modal con: lista de trayectos, metadatos, grafo
// del trayecto, textarea de contenido del nodo y editor JSON (pasos y aristas).
// Cada paso puede llevar `incluye` para agrupar conceptos del motor.

import { esc } from '../ui.js';
import {
getTrayectos, saveTrayecto, deleteTrayecto, setActiveTrayecto,
buildTrayectoFromTrajectory, composeTrayectoStep,
} from '../lab/trayectos.js';
import { downloadJSON } from '../lab/session.js';

const trunc = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

export function openTrayectoEditor(App, faq, bestTraj) {
const S = App.S;
let list = getTrayectos(faq.id);
let selected = list.find(t => t.activo) || list[0] || null;

const dialog = document.createElement('dialog');
dialog.className = 'trayecto-modal';
dialog.setAttribute('aria-labelledby', 'tm-title');
document.body.appendChild(dialog);

let destroyed = false;
function destroy() {
if (destroyed) return;
destroyed = true;
if (dialog.open) { try { dialog.close(); } catch (_) {} }
dialog.remove();
}

function refreshList() { list = getTrayectos(faq.id); }

function conceptLabel(id) {
return S.FN?.[id]?.label || S.N?.[id]?.label || id;
}

function renderTrayectoGraph(trayecto) {
const pasos = trayecto.pasos || [];
const n = pasos.length;
if (!n) {
return '<svg class="trayecto-graph" viewBox="0 0 260 60" width="260" height="60" xmlns="http://www.w3.org/2000/svg"><text x="130" y="35" text-anchor="middle" fill="var(--muted)" font-size="12">Sin pasos definidos</text></svg>';
}
const NODE_W = 180, MARGIN = 70, CY = 64, R = 26;
const hasIncludes = pasos.some(p => (p.incluye || []).length > 0);
const H = hasIncludes ? 185 : 155;
const W = MARGIN * 2 + (n - 1) * NODE_W;
let edges = '';
for (let i = 0; i < n - 1; i++) {
const x1 = MARGIN + i * NODE_W + R;
const x2 = MARGIN + (i + 1) * NODE_W - R - 7;
const arista = trayecto.aristas?.[i];
edges += `<g class="tg-edge"><line x1="${x1}" y1="${CY}" x2="${x2}" y2="${CY}"/><polygon points="${x2 - 7},${CY - 4} ${x2},${CY} ${x2 - 7},${CY + 4}"/></g>`;
if (arista?.titulo) {
edges += `<text x="${(x1 + x2) / 2}" y="${CY - 12}" text-anchor="middle" font-size="8" class="tg-edge-label">${esc(trunc(arista.titulo, 24))}</text>`;
}
}
let nodes = '';
pasos.forEach((p, i) => {
const x = MARGIN + i * NODE_W;
const titulo = trunc(p.titulo || p.nodo || p.sub || 'paso', 18);
const incluye = p.incluye || [];
let incluyeSvg = '';
if (incluye.length) {
const labels = incluye.map(inc => conceptLabel(inc.nodo)).join(' · ');
incluyeSvg = `<text x="${x}" y="${CY + R + 30}" text-anchor="middle" font-size="8.5" class="tg-incluye">⊃ ${esc(trunc(labels, 36))}</text>`;
}
const titleText = String(p.titulo || p.nodo || '') + (incluye.length ? '\nIncluye: ' + incluye.map(inc => `${conceptLabel(inc.nodo)} (${inc.sub})`).join(', ') : '');
nodes += `<g class="tg-node${incluye.length ? ' tg-node--grouped' : ''}" data-step="${i}" role="button" tabindex="0" aria-label="Paso ${i + 1}: ${esc(p.titulo || p.nodo || '')}${incluye.length ? ` (incluye ${incluye.length} conceptos)` : ''}">
<title>${esc(titleText)}</title>
<circle cx="${x}" cy="${CY}" r="${R}"/>
<text x="${x}" y="${CY + 4}" text-anchor="middle" font-size="11" font-weight="600">${i + 1}</text>
<text x="${x}" y="${CY + R + 16}" text-anchor="middle" font-size="10">${esc(titulo)}</text>
${incluyeSvg}
</g>`;
});
return `<svg class="trayecto-graph" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" role="img">${edges}${nodes}</svg>`;
}

function renderListHtml() {
return `<table class="lab-ranking"><thead><tr><th>Activo</th><th>Título</th><th>Dificultad</th><th>Fecha</th><th>Pasos</th><th></th></tr></thead><tbody>
${list.map(t => `<tr>
<td><input type="radio" name="tm-activo" data-tm-activo="${esc(t.id)}" ${t.activo ? 'checked' : ''} aria-label="Marcar activo"></td>
<td>${esc(t.titulo)}</td>
<td>${esc(t.dificultad)}</td>
<td>${esc(t.fecha)}</td>
<td>${(t.pasos || []).length}</td>
<td>
<button type="button" class="lab-btn lab-btn--ghost" data-tm-select="${esc(t.id)}">Editar</button>
<button type="button" class="lab-btn lab-btn--ghost" data-tm-del="${esc(t.id)}">Eliminar</button>
</td>
</tr>`).join('')}
</tbody></table>`;
}

function renderEditor() {
const box = dialog.querySelector('.tm-editor');
if (!box) return;
if (!selected) {
box.innerHTML = '<p class="hint">No hay ningún trayecto seleccionado. Creá uno desde la trayectoria calculada o elegí uno de la lista.</p>';
return;
}
box.innerHTML = `
<section class="lab-card tm-card">
<h3>Trayecto <code>${esc(selected.id)}</code></h3>
<div class="tm-meta">
<label>Título <input type="text" class="lab-input" data-tm-field="titulo" value="${esc(selected.titulo)}"></label>
<label>Dificultad <select class="lab-input" data-tm-field="dificultad">${['intro', 'intermedio', 'avanzado'].map(d => `<option ${selected.dificultad === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
<label>Fecha <input type="date" class="lab-input" data-tm-field="fecha" value="${esc(selected.fecha)}"></label>
<label class="tm-check"><input type="checkbox" data-tm-field="activo" ${selected.activo ? 'checked' : ''}> activo</label>
</div>
<h4>Grafo del trayecto <span class="hint">(click en un nodo para ver su contenido; los nodos con ⊃ agrupan varios conceptos del motor)</span></h4>
<div class="tm-graph"></div>
<label for="tm-node-content">Contenido del paso seleccionado (como lo vería el usuario en el chat)</label>
<textarea id="tm-node-content" class="tm-node-content" rows="4" readonly placeholder="Seleccioná un nodo del grafo…"></textarea>
<label for="tm-json">JSON del trayecto (pasos y aristas)</label>
<p class="hint">El trayecto es lineal: <code>pasos[i]</code> es el nodo <em>i</em> y <code>aristas[i]</code> la transición del paso <em>i</em> al <em>i+1</em>. Cada paso puede llevar <code>incluye</code> (array de <code>{nodo, sub}</code>) para agrupar conceptos del motor en un nodo pedagógico. Después de editar usá «Actualizar grafo».</p>
<textarea id="tm-json" class="tm-json-editor" spellcheck="false">${esc(JSON.stringify({ pasos: selected.pasos, aristas: selected.aristas }, null, 2))}</textarea>
<div class="tm-toolbar">
<button type="button" class="lab-btn" data-tm-save>Guardar</button>
<button type="button" class="lab-btn lab-btn--ghost" data-tm-preview>Actualizar grafo</button>
<button type="button" class="lab-btn lab-btn--ghost" data-tm-export-one>Exportar este trayecto</button>
</div>
<p class="tm-status" role="status"></p>
</section>`;
renderGraph();
}

function renderGraph() {
const g = dialog.querySelector('.tm-graph');
if (g && selected) g.innerHTML = renderTrayectoGraph(selected);
}

function renderAll() {
if (destroyed) return;
dialog.innerHTML = `
<header class="modal-head">
<h3 id="tm-title">Editar trayecto · ${esc(faq.pregunta)}</h3>
<button type="button" data-tm-close aria-label="Cerrar">×</button>
</header>
<div class="modal-body">
<div class="tm-toolbar">
<button type="button" class="lab-btn" data-tm-new ${bestTraj?.path?.length ? '' : 'disabled title="No hay una trayectoria calculada"'}>＋ Nuevo desde la trayectoria calculada</button>
<button type="button" class="lab-btn lab-btn--ghost" data-tm-export-all ${list.length ? '' : 'disabled'}>Exportar todos (JSON)</button>
</div>
${list.length ? renderListHtml() : '<p class="hint">Todavía no hay trayectos guardados para esta FAQ. Creá uno desde la trayectoria calculada.</p>'}
<div class="tm-editor"></div>
</div>`;
renderEditor();
}

function createNew() {
if (!bestTraj?.path?.length) return;
const t = buildTrayectoFromTrajectory(S, bestTraj, faq);
saveTrayecto(faq.id, t);
setActiveTrayecto(faq.id, t.id);
refreshList();
selected = list.find(x => x.id === t.id) || t;
renderAll();
}

function previewGraph() {
const status = dialog.querySelector('.tm-status');
const ta = dialog.querySelector('#tm-json');
try {
const parsed = JSON.parse(ta.value);
selected.pasos = Array.isArray(parsed.pasos) ? parsed.pasos : [];
selected.aristas = Array.isArray(parsed.aristas) ? parsed.aristas : [];
renderGraph();
const nc = dialog.querySelector('#tm-node-content');
if (nc) nc.value = '';
if (status) status.textContent = 'Grafo actualizado (sin guardar).';
} catch (err) {
if (status) status.textContent = `JSON inválido: ${err.message}`;
}
}

function saveSelected() {
const status = dialog.querySelector('.tm-status');
const ta = dialog.querySelector('#tm-json');
try {
const parsed = JSON.parse(ta.value);
selected.pasos = Array.isArray(parsed.pasos) ? parsed.pasos : [];
selected.aristas = Array.isArray(parsed.aristas) ? parsed.aristas : [];
saveTrayecto(faq.id, selected);
if (selected.activo) setActiveTrayecto(faq.id, selected.id);
refreshList();
if (status) status.textContent = 'Guardado.';
renderAll();
} catch (err) {
if (status) status.textContent = `JSON inválido: ${err.message}`;
}
}

dialog.addEventListener('click', e => {
if (e.target.closest('[data-tm-close]') || e.target === dialog) { destroy(); return; }
const node = e.target.closest('.tg-node');
if (node && selected) {
const idx = Number(node.dataset.step);
const ta = dialog.querySelector('#tm-node-content');
if (ta) ta.value = composeTrayectoStep(selected, idx);
dialog.querySelectorAll('.tg-node').forEach(g => g.classList.remove('selected'));
node.classList.add('selected');
return;
}
if (e.target.closest('[data-tm-new]')) { createNew(); return; }
if (e.target.closest('[data-tm-export-all]')) { downloadJSON(list, `trayectos.${faq.id}.json`); return; }
const sel = e.target.closest('[data-tm-select]');
if (sel) { selected = list.find(t => t.id === sel.dataset.tmSelect) || null; renderAll(); return; }
const del = e.target.closest('[data-tm-del]');
if (del) {
deleteTrayecto(faq.id, del.dataset.tmDel);
refreshList();
if (selected && selected.id === del.dataset.tmDel) selected = list.find(t => t.activo) || list[0] || null;
renderAll();
return;
}
if (e.target.closest('[data-tm-save]')) { saveSelected(); return; }
if (e.target.closest('[data-tm-preview]')) { previewGraph(); return; }
if (e.target.closest('[data-tm-export-one]')) { if (selected) downloadJSON(selected, `${selected.id}.json`); return; }
});

// Los nodos SVG son botones accesibles también mediante el teclado.
dialog.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const node = e.target.closest('.tg-node');
  if (!node) return;
  e.preventDefault();
  node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});

dialog.addEventListener('input', e => {
const f = e.target.closest('[data-tm-field]');
if (f && selected) selected[f.dataset.tmField] = f.type === 'checkbox' ? f.checked : f.value;
});

dialog.addEventListener('change', e => {
const radio = e.target.closest('[data-tm-activo]');
if (radio) {
setActiveTrayecto(faq.id, radio.dataset.tmActivo);
refreshList();
selected = list.find(t => t.id === radio.dataset.tmActivo) || selected;
renderAll();
}
});

dialog.addEventListener('cancel', e => { e.preventDefault(); destroy(); });

renderAll();
if (typeof dialog.showModal === 'function') dialog.showModal();
else dialog.setAttribute('open', '');
return { destroy };
}