// Componente de árbol plegable, común al estático y al funcional
import { esc, KIND } from '../ui.js';
import { href } from '../router.js';
export const OPEN = {estatico: new Set(), funcional: new Set()};
export function toggle(tree, id) { const o = OPEN[tree]; o.has(id) ? o.delete(id) : o.add(id); }
const chev = o => `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style="transform:rotate(${o ? 90 : 0}deg)"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
// opts: {tree, nodes, sel, cnt(id), badges(n) → html}
export function tnode(o, id) {
  const n = o.nodes[id], kids = n.hijos, op = OPEN[o.tree].has(id), c = o.cnt(id), sel = o.sel === id;
  return `<li><div class="trow">${kids.length ? `<button type="button" class="tg" data-action="tg" data-tree="${o.tree}" data-id="${id}" aria-expanded="${op}" aria-label="${op ? 'Cerrar' : 'Abrir'} ${esc(n.label)}">${chev(op)}</button>` : '<span class="tgsp"></span>'}
    <a class="tn${sel ? ' sel' : ''}" href="${href(o.tree, id)}"${sel ? ' aria-current="true"' : ''}><span>${esc(n.label)}</span><span class="g">${esc(n.gr || '')}</span>${o.badges(n)}${c ? `<span class="cnt" title="${o.cntTitle}">${c}</span>` : ''}</a></div>
    ${kids.length && op ? `<ul>${kids.map(k => tnode(o, k)).join('')}</ul>` : ''}</li>`;
}
export const kb = k => `<span class="kb ${k}">${KIND[k]}</span>`;
