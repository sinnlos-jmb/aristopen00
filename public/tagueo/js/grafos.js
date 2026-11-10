// Puente con los grafos de public/grafos: no los modifica; los abre en un modal grande (iframe).
import { CONFIG } from './config.js';
import { esc, sec, vb } from './ui.js';
import { refsEnTramo } from './store.js';

export const graphLabel = (S, file) => (S.graphs.find(g => g.file === file) || {}).label || file;
export function grafoBtn({file, node, edge, title, sub, cls = 'lk', txt}) {
  return `<button type="button" class="${cls}" data-action="grafo" data-file="${esc(file)}"${node ? ` data-node="${esc(node)}"` : ''}${edge ? ` data-edge="${esc(edge)}"` : ''} data-title="${esc(title || '')}" data-sub="${esc(sub || '')}">${txt ?? esc(title)}</button>`;
}
const entryBtn = (S, x) => grafoBtn({file: x.file, node: x.kind === 'nodo' ? x.id : null, edge: x.kind === 'arista' ? x.id : null,
  title: graphLabel(S, x.file), sub: x.kind === 'arista' ? `${x.title || x.id} · ${x.label || ''}` : x.label,
  txt: `<span class="kb ${x.kind === 'nodo' ? 'nodo' : 'arista'}">${x.kind === 'nodo' ? 'nodo' : 'arista'}</span> ${esc(x.kind === 'arista' ? (x.title || x.id) : x.label)}${x.kind === 'arista' && x.label ? ` <span class="g">${esc(x.label)}</span>` : ''}`});

// Voz de una arista de grafo registrada del lado del tagueo (voces_grafos; los grafos no la llevan)
export function vgBadges(S, file, edge) {
  const v = S.VG?.[`${file}|${edge}`]; if (!v) return '';
  return ` <span class="vgv">${v.voz.map(vb).join(' ')}</span><div class="sub small vgt">${esc(v.t)}</div>`;
}
// Bloque plegable: nodos y aristas de los grafos que citan el tramo [a, b]
export const AMPLIO = 25; // ancho (en líneas Bekker aprox.) a partir del cual una cita se considera de tramo amplio
export function refsBlock(S, a, b, titulo = 'En los grafos') {
  if (!S.refs) return '';
  const xs = refsEnTramo(S, a, b);
  if (!xs.length) return `${sec(titulo)}<div class="sub small">Ningún nodo ni arista de los grafos cita este tramo.</div>`;
  const order = S.graphs.map(g => g.file), files = [...new Set(xs.map(x => x.file))].sort((p, q) => order.indexOf(p) - order.indexOf(q));
  const prec = xs.filter(x => !x.cf && x.ancho < AMPLIO).length, ncf = xs.filter(x => x.cf).length;
  const cut = (s, n) => s.length > n ? s.slice(0, n - 2) + '…' : s;
  const item = x => `<div class="gi${x.cf || x.ancho >= AMPLIO ? ' amplio' : ''}">${entryBtn(S, x)}${x.kind === 'arista' ? vgBadges(S, x.file, x.id) : ''}<span class="sub small" title="${esc(x.raw + (x.raw_cf ? ' · cf. ' + x.raw_cf : ''))}">${esc(cut(x.raw, 110))}${x.raw_cf ? ` <span class="refcf">· cf. ${esc(cut(x.raw_cf, 80))}</span>` : ''}</span></div>`;
  const groups = files.map(f => {
    const items = xs.filter(x => x.file === f).sort((p, q) => p.ancho - q.ancho), pr = items.filter(x => !x.cf && x.ancho < AMPLIO), am = items.filter(x => !x.cf && x.ancho >= AMPLIO), cf = items.filter(x => x.cf);
    return `<div class="ggroup"><div class="gh">${grafoBtn({file: f, title: graphLabel(S, f), cls: 'lk strong', txt: esc(graphLabel(S, f))})}<span class="sub small">${esc(f)}</span></div>
      ${pr.map(item).join('')}${am.length ? `<div class="gam">Tramo amplio (${am.length})</div>${am.map(item).join('')}` : ''}${cf.length ? `<div class="gam">Solo en el cotejo, cf. (${cf.length})</div>${cf.map(item).join('')}` : ''}</div>`;
  }).join('');
  return `<details class="block gref"><summary><b>${titulo}</b> · ${prec} con cita precisa y ${xs.length - prec - ncf} de tramo amplio${ncf ? `, ${ncf} solo en el cotejo` : ''}, en ${files.length} grafo${files.length > 1 ? 's' : ''}</summary>${groups}</details>`;
}
// ---- modal ----
let dlg, frame, revision;
export function initModal(sourceRevision) {
  revision = sourceRevision;
  dlg = document.getElementById('gmodal'); frame = document.getElementById('gm-frame');
  document.getElementById('gm-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { frame.src = 'about:blank'; });
}
export function openGraph({file, node, edge, title, sub}) {
  // los grafos seleccionan nodos por hash; para una arista se abre en su nodo de origen y luego se la selecciona
  const target = node || (edge ? edge.split('--')[0] : '');
  const params = new URLSearchParams({revision});
  if (edge) params.set('arista', edge);
  const url = CONFIG.grafos + file + '?' + params + (target ? '#' + encodeURIComponent(target) : '');
  document.getElementById('gm-title').textContent = title || file;
  document.getElementById('gm-sub').textContent = sub || '';
  document.getElementById('gm-open').href = url;

  frame.src = 'about:blank';
  requestAnimationFrame(() => { frame.src = url; });
  if (!dlg.open) dlg.showModal();
}
