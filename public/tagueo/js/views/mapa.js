// Mapa de la obra (D21): super-unidades › libros › unidades › sub-unidades. Semilla del grafo navegable.
import { esc, ST, pill, vb } from '../ui.js';
import { href } from '../router.js';
import { mapaRefs } from '../store.js';

// de dónde se remite a cada destino del mapa (referencias «mapa» de sub-unidades y notas)
function desdeIdx(S) {
  const by = {};
  mapaRefs(S).forEach(m => (by[m.a] ??= []).push(m));
  return a => (by[a] || []).map(m => m.desde.sub
    ? `<a class="lk small" href="${href('unidad', [S.SUB[m.desde.sub].unidad, m.desde.sub])}" title="${esc(m.t || '')}">${esc(m.desde.sub)}</a>`
    : `<a class="lk small" href="${href('parrafo', m.desde.parrafo)}" title="${esc(m.t || '')}">§${m.desde.parrafo}${m.desde.bekker ? ' · ' + esc(m.desde.bekker) : ''}</a>`).join(', ');
}
const desdeHtml = x => x ? `<div class="sub small mt6">Se remite aquí desde: ${x}</div>` : '';
export function render(S, r) {
  const M = S.tags.mapa, sel = r.args[0];
  if (!M) return {html: '<div class="empty">Falta el mapa de la obra en los datos.</div>', title: 'Mapa'};
  const desde = desdeIdx(S), L = M.libro_tagueado, U = S.tags.unidades;
  const nsub = U.reduce((a, u) => a + u.subunidades.length, 0), nlib = M.super_unidades.reduce((a, x) => a + x.libros.length, 0);
  const unidad = u => `<li class="mu${u.id === sel ? ' hl' : ''}" id="map-${esc(u.id)}"><div><a class="lk strong" href="${href('unidad', u.id)}">${esc(u.titulo)}</a> ${pill(u.estado)} <span class="sub small">${u.tramos.map(t => t.join('–')).join(' + ')} · §${u.parrafos[0]}–${u.parrafos.at(-1)}${u.subunidades.length ? ' · ' + u.subunidades.length + ' sub-unidades' : ''}</span></div>
     ${u.subunidades.length ? `<details${u.id === sel ? ' open' : ''}><summary class="sub small">Sub-unidades</summary><ul class="msubs">${u.subunidades.map(s => `<li><a class="lk" href="${href('unidad', [u.id, s.id])}">${esc(s.bekker.join('–'))} · ${esc(s.titulo)}</a> <span class="sub small">${esc(ST[s.estado] || s.estado)}</span>${desde('sub:' + s.id) ? ` <span class="sub small">· remitida desde ${desde('sub:' + s.id)}</span>` : ''}</li>`).join('')}</ul></details>` : ''}
     ${desdeHtml(desde('unidad:' + u.id))}</li>`;
  const libro = l => `<div class="mlib"><b>Libro ${esc(l.n)}</b> · ${esc(l.titulo)}${l.n === L ? ` <span class="sub small">· ${U.length} unidades, ${nsub} sub-unidades</span><ol class="munits">${U.map(unidad).join('')}</ol>` : ' <span class="sub small">· sin tagueo todavía</span>'}</div>`;
  const sup = x => `<article class="card msup${x.id === sel ? ' hl' : ''}" id="map-${esc(x.id)}"><div class="ch"><b>${esc(x.id)}</b><span>${esc(x.titulo)}</span><span class="sub small">${x.libros.length > 1 ? 'libros ' + esc(x.libros[0].n) + '–' + esc(x.libros.at(-1).n) : 'libro ' + esc(x.libros[0].n)}</span></div>
     <p class="mt6">${esc(x.t)}</p>${x.libros.map(libro).join('')}${desdeHtml(desde('super:' + x.id))}</article>`;
  const h = `<div class="ph"><h2>Mapa de la obra</h2><span class="sub">${M.super_unidades.length} super-unidades · ${nlib} libros · libro ${esc(L)}: ${U.length} unidades y ${nsub} sub-unidades</span></div>
    <div class="block intro"><p>${vb(M.voz)} ${esc(M.nota)}</p><div class="sub small">Es la semilla del grafo navegable: super-unidades › libros › unidades › sub-unidades.</div></div>
    ${M.super_unidades.map(sup).join('')}`;
  return {html: h, title: 'Mapa', focus: sel ? 'map-' + sel : null};
}
