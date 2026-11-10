// Red funcional (temática): categorías, conceptos generales, aristas funcionales y lo que el estático ancla en cada nodo
import { esc, RELP, VIA, row, sec, vb, sense, refLink, fLink, pathHtml, moldeHtml, moldeNota } from '../ui.js';
import { href } from '../router.js';
import { fcntOf, molde, revSteps } from '../store.js';
import { grafoBtn, graphLabel } from '../grafos.js';
import { OPEN, tnode, kb } from './tree.js';
import { CONFIG } from '../config.js';

let init = false;
const badges = n => `${n.kind !== 'compartido' ? kb(n.kind) : ''}${n.depth > 1 && n.voz === 'nuestra' && n.kind !== 'compartido' ? '' : ''}`;
export function aristaHtml(S, e, from) {
  const REL = S.ftree.relaciones_arista, out = !from || e.de === from;
  const g = e.grafo ? ' · ' + grafoBtn({file: e.grafo.file, edge: e.grafo.edge, title: graphLabel(S, e.grafo.file), sub: `${e.grafo.edge} · ${e.label}`, txt: 'ver en el grafo'}) : '';
  return `<div class="farista">${fLink(S, e.de)} <em>— ${esc(REL[e.rel] || e.rel)} <span class="g">${esc(e.label)}</span> →</em> ${fLink(S, e.a)} ${vb(e.voz)}
    <div class="sub small">${esc(e.ref)}${g}</div>${e.nota ? `<div class="sub small">${esc(e.nota)}</div>` : ''}</div>`;
}
function ficha(S, id) {
  const n = S.FN[id], par = n.path.length ? S.FN[n.path.at(-1)] : null, st = S.N[id];
  const rows = [row('Ruta', [...n.path, id].map(i => esc(S.FN[i].label)).join(' › '), 'mt12'), row('Tipo', `${kb(n.kind)} · nivel ${n.depth} de ${S.ftree.max_profundidad}`)];
  if (par) rows.push(row('Relación', `${RELP[n.rel] || n.rel} ${fLink(S, par.id)} · ${vb(n.voz)}`));
  if (n.ref) rows.push(row('Referencia', esc(n.ref)));
  const d = n.def || st?.def; if (d) rows.push(row('Definición', esc(d) + (!n.def && st ? ' <span class="sub small">(del estático)</span>' : '')));
  if (st) rows.push(row('En el estático', `${refLink(S, id)} <span class="sub small">· ${[...st.path, id].map(i => esc(S.N[i].label)).join(' › ')}</span>`));
  if (n.remite_a) rows.push(row('Remite a', n.remite_a.map(r => `<div>${refLink(S, r)}</div>`).join('')));
  if (n.depth > 1) {
    const sal = S.FE.filter(e => e.de === id), ent = S.FE.filter(e => e.a === id);
    rows.push(row('Aristas', (sal.length || ent.length) ? [...sal, ...ent].map(e => aristaHtml(S, e, id)).join('') : '<span class="sub">Sin aristas funcionales propias; se conecta por el árbol funcional.</span>'));
    const cov = S.COV[id] || [], byC = {};
    cov.forEach(x => (byC[x.c] ??= []).push(x));
    rows.push(row('Cobertura del estático', Object.keys(byC).length ? Object.entries(byC).map(([c, xs]) => {
      const all = xs.some(x => !x.s), ss = xs.filter(x => x.s).map(x => x.s);
      const sn = !all && ss.length ? ` <i>· ${ss.map(s => esc(sense(S, c, s))).join(', ')}</i>` : '';
      return `<span class="cov"><a class="lk" href="${href('estatico', c)}">${esc(S.N[c].label)}</a>${sn} <span class="sub small">${esc(VIA[xs[0].via])}</span></span>`; }).join('') : '<span class="sub">Nada del estático se ancla aquí.</span>'));
    const fu = S.fusage[id] || [];
    const fq = S.tags.faqs.filter(f => f.arbol?.nodo === id), ft = S.tags.faqs.filter(f => (f.tambien || []).some(b => b.nodo === id));
    if (fq.length || ft.length) rows.push(row('Preguntas (FAQ)', fq.map(f => `<div><a class="lk" href="${href('faq', f.id)}">${esc(f.pregunta)}</a></div>`).join('') + ft.map(f => `<div><span class="sub small">también:</span> <a class="lk" href="${href('faq', f.id)}">${esc(f.pregunta)}</a></div>`).join('')));
    rows.push(row('En el texto (derivado)', fu.length ? fu.map(x => `<a class="lk" href="${href('parrafo', x.p, {f: id})}">§${x.p}</a>`).join(' · ') : '<span class="sub">Ningún párrafo tagueado lo activa todavía.</span>'));
    rows.push(sec('Trayectos') + `<div class="mb6">${moldeNota(S)} ${vb('nuestra')}</div>` +
      CONFIG.polos.map(p => moldeHtml(S, molde(S, [id], p), p, revSteps)).join(''));
  } else rows.push(row('Debajo', n.hijos.map(h => fLink(S, h)).join(' · ')));
  return `<div class="ficha"><div class="crumb">${n.path.map(i => `<a href="${href('funcional', i)}">${esc(i + '. ' + S.FN[i].label)}</a>`).join(' › ') || 'Categoría'}</div>
    <div class="ch"><b class="ft">${esc(n.depth === 1 ? id + '. ' + n.label : n.label)}</b><span class="g fg">${esc(n.gr || '')}</span></div>${rows.join('')}
    ${n.depth > 1 ? `<div class="mt12"><a class="btn" href="${href('parrafo', 1, {f: id})}">Filtrar párrafos que activan ${esc(n.label)}</a></div>` : ''}</div>`;
}
export function render(S, r) {
  if (!init) { S.ftree.categorias.forEach(c => OPEN.funcional.add(c.id)); init = true; }
  const id = S.FN[r.args[0]] ? r.args[0] : 'eudaimonia';
  S.FN[id].path.forEach(i => OPEN.funcional.add(i));
  const T = S.ftree, o = {tree: 'funcional', nodes: S.FN, sel: id, cnt: i => fcntOf(S, i), badges, cntTitle: 'Párrafos tagueados que lo activan (derivado)'};
  const h = `<div class="ph"><h2>Red funcional</h2><span class="sub">${S.fids.length} nodos · ${S.FE.length} aristas · temática y dinámica · la lectura de cada párrafo se deriva del tagueo estático</span></div>
   <div class="legend">${kb('categoria')}${kb('propio')}<span>sin etiqueta = compartido con el estático (mismo id) · el número indica cuántos párrafos tagueados lo activan</span></div>
   <div class="split"><div class="tree"><ul>${T.categorias.map(c => tnode(o, c.id)).join('')}</ul></div><div class="fwrap">${ficha(S, id)}</div></div>
   ${sec(`Aristas funcionales (${S.FE.length})`)}<div class="block">${S.FE.map(e => aristaHtml(S, e)).join('')}</div>
   ${sec('Reglas del funcional')}<ul class="reglas">${T.reglas.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return {html: h, title: 'Funcional · ' + S.FN[id].label, keepScroll: true};
}
