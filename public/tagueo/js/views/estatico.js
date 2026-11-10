// Árbol estático (neutral): qué es cada concepto, todos sus sentidos, y su lectura funcional derivada
import { esc, KIND, RELP, ATR, VLAB, VIA, row, sec, vb, sense, refLink, fLink, catHtml, pathHtml, moldeHtml, defHtml, claveTag } from '../ui.js';
import { href } from '../router.js';
import { cntOf, anchorsOf, molde, revSteps } from '../store.js';
import { grafoBtn, graphLabel } from '../grafos.js';
import { OPEN, tnode, kb } from './tree.js';
import { CONFIG } from '../config.js';

let init = false;
const nlink = (S, x) => S.N[x] ? `<a class="lk" href="${href('estatico', x)}">${esc(S.N[x].label)} <span class="g">${esc(S.N[x].gr)}</span></a>` : esc(x);
const badges = n => `${n.kind !== 'concepto' ? kb(n.kind) : ''}${n.depth > 1 && n.voz === 'nuestra' ? '<span class="kb nuestra" title="La relación con el padre es agrupación nuestra">nuestra</span>' : ''}${n.depth === 1 && n.cat ? `<span class="kb cat" title="Categoría aristotélica">${esc(n.cat.gr)}</span>` : ''}`;
const usoTxt = (S, us) => us.map(x => `<a class="lk" href="${href('parrafo', x.p)}">§${x.p}${x.s ? ` <i>${esc(sense(S, x.c, x.s))}</i>` : ''} (${x.n === 'mencion' ? 'mención' : x.n})</a>`).join(' · ');

// anclas y trayectos (lectura nuestra, derivada)
export function lecturaFuncional(S, c, s) {
  const an = anchorsOf(S, c, s);
  if (!an.length) return '<span class="sub">Sin ancla en el funcional.</span>';
  const anc = an.map(a => `<div>${fLink(S, a.f)} <span class="sub small">· ${VIA[a.via]}${a.via !== 'compartido' ? ` (${esc(a.de.replace('#', ' · '))})` : ''}</span></div>`).join('');
  const tr = CONFIG.polos.map(p => moldeHtml(S, molde(S, an.map(a => a.f), p), p, revSteps)).join('');
  return `${anc}<div class="mt6">${tr}</div>`;
}
function ficha(S, id) {
  const n = S.N[id], par = n.path.length ? S.N[n.path.at(-1)] : null, a = n.atributos || {};
  const ruta = [...n.path, id].map(i => esc(S.N[i].label)).join(' › ');
  const rows = [row('Ruta', ruta, 'mt12'), row('Tipo', `${kb(n.kind)} · nivel ${n.depth} de ${S.tree.max_profundidad}`)];
  rows.push(row('Categoría', `${catHtml(n.cat)} · ${n.catPropia ? 'propia' : n.cat ? `heredada de ${nlink(S, n.cat.de)}` : ''}${n.cat ? ' · ' + vb(n.cat.voz) : ''}${n.cat?.nota ? `<div class="sub small">${esc(n.cat.nota)}</div>` : ''}`));
  if (par) rows.push(row('Relación', `${RELP[n.rel] || n.rel} ${nlink(S, par.id)} · ${vb(n.voz)}`));
  if (n.ref) rows.push(row('Referencia', esc(n.ref)));
  if (n.def) rows.push(row('Definición', esc(n.def)));
  // clave de lectura (D26): qué aporta, en qué sub-unidades se usa y en qué párrafos activa implícitos
  Object.values(S.CLV || {}).filter(x => x.nodo === id).forEach(x => {
    const ss = Object.values(S.SUB).filter(s => (s.claves || []).some(z => z.k === x.id));
    const ps = S.tags.parrafos.filter(p => p.conceptos.some(k => (k.claves || []).includes(x.id))).map(p => p.parrafo);
    rows.push(row('Clave de lectura', `<div>${claveTag(S, x.id)} <b>${esc(x.nombre)}</b> <span class="sub">· aporta ${esc(x.aporta)}</span> ${vb(x.voz)}</div><div class="mt4">${esc(x.t)}</div><div class="sub small">${esc(x.ref)}</div>${ss.length ? `<div class="mt4 small">Sub-unidades: ${ss.map(s => `<a class="lk" href="${href('unidad', [s.unidad, s.id])}">${esc(s.bekker.join('–'))}</a>`).join(' · ')}</div>` : ''}${ps.length ? `<div class="small">Activa implícitos (con vía) en los párrafos: ${ps.map(n => `<a class="lk" href="${href('parrafo', n)}">§${n}</a>`).join(' · ')}</div>` : ''}`));
  });
  (S.DEFC[id] || []).forEach(d => rows.push(row('Definición por etapas', `<div class="sub small">${esc(d.titulo || '')} · ${d.etapas.length} etapas</div>` + defHtml(S, d))));
  const us = (S.usage[id] || []).map(x => ({...x, c: id}));
  if (n.sentidos) rows.push(row('Sentidos', n.sentidos.map(z => { const u = us.filter(x => x.s === z.id);
    return `<div class="sen"><b>${esc(z.label)}</b>${z.ref ? ` <span class="sub small">${esc(z.ref)}</span>` : ''}${z.en ? ` <span class="sub small">· se encuadra en</span> ${refLink(S, z.en)}` : ''}${z.ver ? ` <span class="sub small">· ver</span> ${refLink(S, z.ver)}` : ''}${u.length ? ` <span class="small">· ${usoTxt(S, u)}</span>` : ''}</div>`; }).join('')));
  const atr = Object.keys(ATR).filter(k => a[k] != null).map(k => row(ATR[k], [].concat(a[k]).map(x => nlink(S, x)).join(' · '))).join('');
  if (atr) rows.push(atr);
  if (n.hijos.length) rows.push(row(n.kind === 'division' ? 'Miembros' : 'Debajo', n.hijos.map(h => nlink(S, h)).join(' · ')));
  rows.push(row('En el texto', us.length ? usoTxt(S, us) : '<span class="sub">Ningún párrafo tagueado todavía lo usa directamente.</span>'));
  const ss = Object.values(S.SUB).filter(s => (s.conceptos_clave || []).includes(id));
  if (ss.length) rows.push(row('Sub-unidades', ss.map(s => `<div><a class="lk" href="${href('unidad', [s.unidad, s.id])}">${esc(s.bekker.join('–'))} · ${esc(s.titulo)}</a></div>`).join('')));
  const gn = (S.refs || []).filter(x => x.kind === 'nodo' && x.cid === id);
  if (gn.length) rows.push(row('En los grafos', gn.map(x => `<div>${grafoBtn({file: x.file, node: x.id, title: graphLabel(S, x.file), sub: x.label, txt: `${esc(graphLabel(S, x.file))} · ${esc(x.label)}`})}</div>`).join('') + '<div class="sub small">Nodos cuyo concepto es este (campo concepto o, si falta, conceptId).</div>'));
  rows.push(sec('Lectura funcional derivada') + `<div class="sub small mb6">Anclas en el funcional y molde de trayecto hacia cada polo. ${vb('nuestra')}</div>` + lecturaFuncional(S, id, null));
  const ds = (n.sentidos || []).filter(z => { const x = anchorsOf(S, id, z.id).map(a => a.f).join(), y = anchorsOf(S, id, null).map(a => a.f).join(); return x !== y; });
  if (ds.length) rows.push(ds.map(z => row(`<i>${esc(z.label)}</i>`, anchorsOf(S, id, z.id).map(a => `${fLink(S, a.f)} <span class="sub small">· ${VIA[a.via]}</span>`).join(' · ') || '<span class="sub">sin ancla</span>')).join(''));
  return `<div class="ficha"><div class="crumb">${n.path.map(i => `<a href="${href('estatico', i)}">${esc(S.N[i].label)}</a>`).join(' › ') || 'Raíz'}</div>
    <div class="ch"><b class="ft">${esc(n.label)}</b><span class="g fg">${esc(n.gr)}</span></div>${rows.join('')}
    <div class="mt12"><a class="btn" href="${href('parrafo', 1, {c: id})}">Filtrar párrafos por ${esc(n.label)}${n.hijos.length ? ' y lo que está debajo' : ''}</a></div></div>`;
}
export function render(S, r) {
  if (!init) { S.tree.raices.forEach(c => OPEN.estatico.add(c.id)); init = true; }
  const id = S.N[r.args[0]] ? r.args[0] : 'eudaimonia';
  S.N[id].path.forEach(i => OPEN.estatico.add(i));
  const T = S.tree, o = {tree: 'estatico', nodes: S.N, sel: id, cnt: i => cntOf(S, i), badges, cntTitle: 'Párrafos tagueados que lo usan (incluye lo que está debajo)'};
  const h = `<div class="ph"><h2>Árbol estático</h2><span class="sub">${Object.keys(S.N).length} nodos · ${T.raices.length} raíces · qué es cada cosa y todos sus sentidos · contra él se taguea</span></div>
   <div class="legend">${['raiz', 'division', 'especie', 'parte'].map(kb).join('')}<span>sin etiqueta = concepto o agrupación</span><span class="kb nuestra">nuestra</span><span>= agrupación nuestra</span><span class="kb cat">οὐσία</span><span>= categoría aristotélica de la raíz · el número indica cuántos párrafos tagueados lo usan</span></div>
   <div class="split"><div class="tree"><ul>${T.raices.map(c => tnode(o, c.id)).join('')}</ul></div><div class="fwrap">${ficha(S, id)}</div></div>
   ${sec('Reglas del estático')}<ul class="reglas">${T.reglas.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
   ${sec(`Relaciones de las unidades (${T.relaciones.length})`)}<p>${T.relaciones.map(x => `<span class="mv">${esc(x.label)}</span>`).join('')}</p>
   ${sec(`Movimientos argumentativos (${T.movimientos.length})`)}<p>${T.movimientos.map(x => `<span class="mv">${esc(x.label)}</span>`).join('')}</p>`;
  return {html: h, title: 'Estático · ' + S.N[id].label, keepScroll: true};
}
