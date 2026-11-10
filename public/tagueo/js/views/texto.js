import { CONFIG } from '../config.js';
import { esc, ST, NIV, VIA, pill, chip, impTag, impTitle, impList, claveTag, recTxt, note, row, sec, vozT, grHtml, lab, labText, vb, sense, fLink, catHtml, pathHtml, moldeHtml, moldeNota, flab, pilarHtml, defChips, fzCtl, tradChip } from '../ui.js';
import { href } from '../router.js';
import { parHas, parStatus, ultimoCapituloTagueado, unitsOf, subsOf, bkLabel, desc, anchorsOf, molde, revSteps } from '../store.js';
import { aristaHtml } from './funcional.js';
import { refsBlock } from '../grafos.js';

export function render(S, r) {
  const flt = S.N[r.query.c] ? {c: r.query.c} : S.FN[r.query.f] && S.FN[r.query.f].depth > 1 ? {f: r.query.f} : null;
  const filtro = flt?.c || null, q = flt || {};
  let n = +r.args[0];
  if (!S.P[n]) return {redirect: href('parrafo', 1, q)};
  if (flt && !parHas(S, n, flt)) { const f = S.pars.find(p => parHas(S, p.nro, flt)); if (f) return {redirect: href('parrafo', f.nro, q)}; }
  // lateral
  let side = '', cap = null, opts = '';
  const limite = ultimoCapituloTagueado(S);
  S.pars.forEach(p => {
    if (p.cap !== cap) { cap = p.cap; side += `<h3>Capítulo ${cap}${cap > limite ? ' · fuera del tramo' : ''}</h3>`; }
    const s = parStatus(S, p.nro), dim = flt && !parHas(S, p.nro, flt);
    side += `<a class="pi${p.nro === n ? ' sel' : ''}${dim ? ' dim' : ''}" href="${href('parrafo', p.nro, q)}"${p.nro === n ? ' aria-current="page"' : ''}><span class="dot ${s}" aria-hidden="true"></span>Párrafo ${p.nro}<small>${ST[s]}</small></a>`;
    opts += `<option value="${href('parrafo', p.nro, q)}"${p.nro === n ? ' selected' : ''}>Cap. ${p.cap} · Párrafo ${p.nro} · ${ST[s]}</option>`;
  });
  const p = S.P[n], tp = S.TP[n], old = S.tags.tags_previos[n], F = flt && (flt.c ? S.N[flt.c] : S.FN[flt.f]);
  let h = `<div class="ph"><h2>Párrafo ${n}</h2><span class="sub">Capítulo ${p.cap} · ${bkLabel(S, n)}</span>
    ${F ? `<span class="filter">${flt.c ? 'Estático' : 'Funcional (derivado)'}: ${esc(F.label)} <span class="g">${esc(F.gr || '')}</span>${flt.c && F.hijos.length ? ' y lo de debajo' : ''}<a href="${href('parrafo', n)}" aria-label="Quitar filtro">×</a></span>` : ''}
    <span class="pager">${fzCtl()}${S.P[n - 1] ? `<a class="btn" href="${href('parrafo', n - 1, q)}">← ${n - 1}</a>` : ''}${S.P[n + 1] ? `<a class="btn" href="${href('parrafo', n + 1, q)}">${n + 1} →</a>` : ''}</span></div>`;
  h += `<div class="texts"><div><h4>Traducción</h4><div class="es" lang="es">${esc(p.es)}</div></div><div><h4>Griego · Bywater</h4><div class="gr" lang="grc">${grHtml(p.gr)}</div></div></div>`;
  if (p.tags.length || old) h += `<div class="block old"><h4>Tagueo tentativo previo (del .txt)</h4>${p.tags.length ? p.tags.map(t => `<code>${esc(JSON.stringify(t))}</code>`).join('') : '<span class="sub">Sin tags.</span>'}${old ? `<div class="verd"><b>${esc(old.veredicto)}.</b> ${esc(old.t)}</div>` : ''}</div>`;
  const intros = subsOf(S, n).filter(s => s.intro);
  const pils = [...new Set(subsOf(S, n).flatMap(s => s.pilares || []))];
  if (intros.length) h += `<div class="block intro"><h4>En pocas palabras</h4>${intros.map(s => `<p><a class="lk small" href="${href('unidad', [s.unidad, s.id])}">${esc(s.bekker.join('–'))}</a> ${esc(s.intro)}</p>`).join('')}${pils.map(x => pilarHtml(S, x)).join('')}${[...new Set(subsOf(S, n).map(s => defChips(S, s.id)))].join('')}</div>`;
  const trs = subsOf(S, n).flatMap(s => S.TRADSUB[s.id] || []);
  if (trs.length) h += `<div class="block trad"><h4>Voces de la tradición</h4>${trs.map(tradChip).join('')}</div>`;
  h += sec('Tags v3 del párrafo · qué se dice');
  if (tp) {
    const match = flt?.c ? desc(S, flt.c) : flt?.f ? new Set(tp.conceptos.filter(k => anchorsOf(S, k.c, k.s).some(a => a.f === flt.f)).map(k => k.c)) : null;
    const lv = Object.keys(NIV).map(k => { const ks = tp.conceptos.filter(x => x.n === k); return ks.length ? `<div class="lvl"><span>${NIV[k]}</span><div>${ks.map(x => chip(S, x, n, filtro, match)).join('')}</div></div>` : ''; }).join('');
    const rows = [row('Conceptos', lv)];
    const imps = tp.conceptos.filter(k => k.implicito && k.via);
    if (imps.length) rows.push(row('Implícitos', `<div class="sub small mb6">No se nombran: se activan por una expresión del texto (vía), con la cita que lo respalda. Si la activación es indirecta, se indica el recurso (analogía, πρὸς ἕν, metáfora, ejemplo, contraste, lugar paralelo).</div>${impList(S, imps)}`));
    const cls = subsOf(S, n).flatMap(s => (s.claves || []).map(x => ({s, x})));
    if (cls.length) rows.push(row('Claves de lectura', cls.map(({s, x}) => `<div class="clvr">${claveTag(S, x.k)} <a class="lk small" href="${href('unidad', [s.unidad, s.id])}">${esc(s.bekker.join('–'))}</a> ${esc(x.t)} ${vb(x.voz)}</div>`).join('')));
    rows.push(row('Voz del texto', vozT(S, tp.voz_texto) + (tp.fuente_rep ? ` · <span class="sub">${esc(tp.fuente_rep)}</span>` : '')));
    if (tp.corchetes?.length) rows.push(row('Estado textual', tp.corchetes.map(c => `<span class="pill corchete" title="Solo se registra; no se discute">Corchete en la edición: ${esc(c)}</span>`).join(' ')));
    if (tp.notas?.length) rows.push(row('Notas', tp.notas.map(x => note(x, S)).join('')));
    // notas de las sub-unidades (D41): se muestran plegadas, sin repetir las del párrafo
    const pt = new Set((tp.notas || []).map(x => x.t)), sn = subsOf(S, n).map(s => ({s, ns: (s.notas || []).filter(x => !pt.has(x.t))})).filter(x => x.ns.length);
    if (sn.length) rows.push(row(tp.notas?.length ? 'Notas de las sub-unidades' : 'Notas', `<details class="subn"><summary>${sn.reduce((a, x) => a + x.ns.length, 0)} notas en ${sn.length} ${sn.length === 1 ? 'sub-unidad' : 'sub-unidades'}${tp.notas?.length ? '' : ' (las notas de este tramo están en las sub-unidades)'}</summary>${sn.map(({s, ns}) => `<div class="subng"><a class="lk small" href="${href('unidad', [s.unidad, s.id])}">${esc(s.bekker.join('–'))} · ${esc(s.titulo)}</a>${ns.map(x => note(x, S)).join('')}</div>`).join('')}</details>`));
    if (tp.faq?.length) rows.push(row('FAQ', tp.faq.map(f => `<div><a class="lk" href="${href('faq', f)}">${esc(S.FAQ[f]?.pregunta || f)}</a></div>`).join('')));
    h += `<article class="card"><div class="ch"><b>Párrafo ${n}</b>${pill(tp.estado)}</div>${rows.join('')}</article>`;
    h += combinacion(S, tp) + lectura(S, tp, n);
  } else h += `<div class="empty">Este párrafo todavía no tiene tags v3. Se revisa cuando lleguemos a él.</div>`;
  h += sec('Unidades que lo contienen · cómo se argumenta');
  h += unitsOf(S, n).map(u => { const ss = u.subunidades.filter(s => s.pars.includes(n));
    return `<div class="block"><div class="ch"><a class="lk strong" href="${href('unidad', u.id)}">${esc(u.titulo)}</a>${pill(u.estado)}<span class="sub">${u.tramos.map(t => t.join('–')).join(' + ')}</span></div>
      ${ss.length ? `<div class="mt6">${ss.map(s => `<div><a class="lk" href="${href('unidad', [u.id, s.id])}">${esc(s.bekker.join('–'))} · ${esc(s.titulo)}</a>${s.pars.length > 1 ? ` <span class="sub small">(párrafos ${s.pars[0]}–${s.pars.at(-1)})</span>` : ''}</div>`).join('')}</div>` : `<div class="sub small mt6">Sin sub-unidades todavía.</div>`}</div>`; }).join('');
  h += refsBlock(S, p.bk_a, p.bk_b);
  return {aside: side, mobile: `<select class="mobsel" aria-label="Elegir párrafo" data-nav>${opts}</select>`, html: h, title: `Párrafo ${n}`};
}

// Combinación categorial: raíces del estático y categoría aristotélica de cada concepto tagueado
function combinacion(S, tp) {
  const by = {};
  tp.conceptos.forEach(k => { const c = S.N[k.c]; if (!c) return; const r = c.path[0] || c.id; (by[r] ??= []).push(k); });
  const cats = {}; tp.conceptos.forEach(k => { const c = S.N[k.c]?.cat; if (c) cats[c.gr] = (cats[c.gr] || 0) + 1; });
  const rows = Object.entries(by).map(([r, ks]) => row(`<a class="lk" href="${href('estatico', r)}">${esc(S.N[r].label)}</a>`,
    ks.map(k => { const c = S.N[k.c]; return `<a class="chip ${k.n}${k.implicito ? ' imp' : ''}" href="${href('estatico', k.c)}" title="${esc(S.tree.niveles[k.n])}${esc(impTitle(k))} · ver en el estático"><span>${esc(c.label)}</span>${k.s ? `<i>· ${esc(sense(S, k.c, k.s))}</i>` : ''}${impTag(k)}<span class="kb cat" title="${esc(c.cat?.label || '')}">${esc(c.cat?.gr || '—')}</span></a>`; }).join(''))).join('');
  return `<details class="block" open><summary><b>Combinación categorial</b> · ${Object.keys(by).length} raíces del estático · ${Object.entries(cats).map(([g, k]) => `<span class="g">${esc(g)}</span> ${k}`).join(' · ')}</summary>${rows}</details>`;
}
// Lectura funcional derivada: anclas activadas, aristas entre ellas y trayectos hacia los polos
function lectura(S, tp, n) {
  const act = {};
  tp.conceptos.forEach(k => anchorsOf(S, k.c, k.s).forEach(a => (act[a.f] ??= []).push({k, a})));
  const ids = Object.keys(act);
  if (!ids.length) return '';
  const rank = {central: 0, presente: 1, mencion: 2}, best = f => Math.min(...act[f].map(x => rank[x.k.n]));
  ids.sort((a, b) => best(a) - best(b));
  const anc = ids.map(f => row(fLink(S, f), act[f].map(({k, a}) => `<span class="cov${k.implicito ? ' imp' : ''}"${k.implicito ? ` title="${esc(impTitle(k).slice(3))}"` : ''}>${esc(lab(S, k.c))}${k.s ? ` <i>· ${esc(sense(S, k.c, k.s))}</i>` : ''}${k.implicito ? ` <span class="kb impk">implícito${k.recurso ? ' · ' + esc(recTxt(k)) : ''}</span>` : ''} <span class="sub small">${esc(VIA[a.via])}${a.via === 'sede' || a.via === 'en' || a.via === 'ancestro' ? ' ' + esc(lab(S, a.de.split('#')[0])) : ''}</span></span>`).join(''))).join('');
  const set = new Set(ids), ar = S.FE.filter(e => set.has(e.de) && set.has(e.a));
  const cen = ids.filter(f => best(f) === 0);
  const tr = CONFIG.polos.map(p => moldeHtml(S, molde(S, cen.length ? cen : ids, p), p, revSteps)).join('');
  const ds = destinosHtml(S, n);
  const fin = (ar.length || ds) ? row('Sentido final', `<div class="sub small">Adónde llegan las ideas del párrafo en la obra. Pueden venir de más adelante: la idea en elaboración se lee desde su sentido final.</div>${ar.map(e => aristaHtml(S, e)).join('')}${ds}`) : '';
  return `<details class="block lfd" open><summary><b>Lectura funcional derivada</b> · ${ids.length} anclas · ${ar.length} aristas entre ellas ${vb('nuestra')}</summary>
    <div class="sub small mb6">Se calcula desde los tags estáticos; no se taguea a mano. Las calificaciones textuales de la aparición (por ejemplo θειότερον) van en las notas del párrafo.${tp.conceptos.some(k => k.implicito) ? ' Los conceptos implícitos (borde punteado) también activan anclas; si la activación es indirecta, se dice por qué recurso.' : ''}</div>
    ${anc}${fin}${row('Trayectos', `${moldeNota(S)}${tr}`)}</details>`;
}
// Destinos de las relaciones de las sub-unidades del párrafo (cómo se reafirma cada idea)
export function destinosHtml(S, n) {
  const DT = Object.fromEntries((S.tree.destinos || []).map(d => [d.id, d]));
  const xs = subsOf(S, n).flatMap(s => (s.relaciones || []).filter(r => r.destinos?.length).map(r => ({s, r})));
  if (!xs.length) return '';
  return `<div class="dests"><div class="sub small mt6"><b>Desde las sub-unidades</b></div>${xs.map(({s, r}) => {
    const [x, y] = r.inv ? [r.a, r.de] : [r.de, r.a];
    const RL = Object.fromEntries(S.tree.relaciones.map(z => [z.id, z.label]));
    return `<div class="dest"><div><a class="lk" href="${href('unidad', [s.unidad, s.id])}">${esc(s.bekker.join('–'))}</a> · ${labText(S, x)} <em>— ${esc(RL[r.rel] || r.rel)} →</em> ${labText(S, y)} <span class="g">${esc(r.gr || '')}</span></div>${destList(S, r.destinos, DT)}</div>`; }).join('')}</div>`;
}
export const destList = (S, ds, DT = Object.fromEntries((S.tree.destinos || []).map(d => [d.id, d]))) => ds.map(d => {
  const e = d.arista && S.FE.find(x => x.id === d.arista);
  const ar = e ? `, con la arista funcional <a class="lk" href="${href('funcional', e.de)}">${esc(flab(S, e.de))} → ${esc(flab(S, e.a))}</a>` : '';
  const ha = d.hacia?.faq ? `<div class="hacia">Se retoma en la FAQ: <a class="lk" href="${href('faq', d.hacia.faq)}">${esc(S.FAQ[d.hacia.faq]?.pregunta || d.hacia.faq)}</a></div>`
    : d.hacia?.meta ? `<div class="hacia">Pregunta guía: ${esc(d.hacia.meta)}</div>` : '';
  return `<div class="dst"><span class="sub small">Destino:</span> <span class="dt ${esc(d.tipo)}" title="${esc(DT[d.tipo]?.d || '')}">${esc(DT[d.tipo]?.label || d.tipo)}</span> ${esc(d.t || '')} (<b class="bk">${esc(d.ref)}</b>)${ar}${ha}</div>`; }).join('');
