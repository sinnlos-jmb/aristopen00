import { esc, ST, pill, note, row, sec, vozT, grHtml, lab, labText, vb, pilarHtml, mapaChips, crumbs, defChips, fzCtl, claveTag, tradChip } from '../ui.js';
import { href } from '../router.js';
import { grafoBtn, graphLabel, refsBlock, vgBadges } from '../grafos.js';
import { destList } from './texto.js';

function relHtml(S, r) {
  const [x, y] = r.inv ? [r.a, r.de] : [r.de, r.a];
  const RL = Object.fromEntries(S.tree.relaciones.map(z => [z.id, z.label]));
  return `<div class="rel">${labText(S, x)} <em>— ${esc(RL[r.rel] || r.rel)} →</em> ${labText(S, y)} <span class="g">${esc(r.gr || '')}</span>${r.cond ? ` <span class="sub">(${esc(r.cond)})</span>` : ''}${r.ref ? ` <span class="sub small">· ${esc(r.ref)}</span>` : ''} ${vb(r.voz)}${r.destinos?.length ? `<div class="dests">${destList(S, r.destinos)}</div>` : ''}</div>`;
}
function subCard(S, s, u, hl) {
  const MV = Object.fromEntries(S.tree.movimientos.map(m => [m.id, m.label]));
  const rows = [];
  if (s.anclas_rotas.length) rows.push(`<div class="warn">Ancla rota (${esc(s.anclas_rotas.join('; '))}): el texto no se pudo recortar. Revisar gr_ancla / es_ancla.</div>`);
  if (s.intro) rows.push(`<div class="intro mt8"><h4>En pocas palabras</h4><p>${esc(s.intro)}</p>${(s.pilares || []).map(x => pilarHtml(S, x)).join('')}${defChips(S, s.id)}</div>`);
  else if (S.DEFSUB?.[s.id]) rows.push(row('Definición', defChips(S, s.id)));
  rows.push(`<div class="texts mt8"><div><h4>Traducción</h4><div class="es" lang="es">${esc(s.es_txt || '—')}</div></div><div><h4>Griego</h4><div class="gr" lang="grc">${grHtml(s.gr_txt || '—')}</div></div></div>`);
  rows.push(row('Párrafo', s.pars.map(n => `<a class="lk" href="${href('parrafo', n)}">§${n}</a>`).join(' · ')));
  rows.push(row('Movimientos', s.movimientos.map(m => `<span class="mv">${esc(MV[m] || m)}</span>`).join('')));
  const M = S.MOM[s.id];
  if (M) rows.push(row('Momento', `<a class="lk" href="${href('unidad', u.id)}"><span class="momn">${esc(M.m.id)}</span> ${esc(M.m.titulo)}</a> <span class="sub small">· de ${u.articulacion.momentos.length} en la articulación</span>`));
  rows.push(row('Voz del texto', vozT(S, s.voz_texto)));
  if (s.claves?.length) rows.push(row('Claves', s.claves.map(x => `<div class="clvr">${claveTag(S, x.k)} ${esc(x.t)} ${vb(x.voz)}</div>`).join('')));
  if (s.conceptos_clave?.length) rows.push(row('Conceptos clave', s.conceptos_clave.map(c => `<a class="chip" href="${href('estatico', c)}"><span>${esc(lab(S, c))}</span><span class="g">${esc(S.N[c]?.gr)}</span></a>`).join('')));
  if (s.relaciones?.length) rows.push(row('Relaciones', s.relaciones.map(x => relHtml(S, x)).join('')));
  if (s.notas?.length) rows.push(row('Notas', s.notas.map(x => note(x, S)).join('')));
  if (S.TRADSUB[s.id]) rows.push(row('Tradición', S.TRADSUB[s.id].map(tradChip).join('')));
  if (s.grafo_aristas?.length && u.grafo) rows.push(row('Aristas del grafo', s.grafo_aristas.map(e => { const x = S.refById[`${u.grafo.file}|arista|${e}`];
    return x ? `<div class="edge">${grafoBtn({file: u.grafo.file, edge: e, title: graphLabel(S, u.grafo.file), sub: `${x.title || e} · ${x.label || ''}`, txt: `${esc(x.title || e)} <span class="g">${esc(x.label || '')}</span>`})} <code>${esc(e)}</code> <span class="sub small">${esc(x.raw || '')}${x.raw_cf ? ` <span class="refcf">· cf. ${esc(x.raw_cf)}</span>` : ''}</span>${vgBadges(S, u.grafo.file, e)}</div>` : `<div class="warn">Arista inexistente: ${esc(e)}</div>`; }).join('') + `<div class="sub small">${esc(u.grafo.label)} · ${esc(u.grafo.file)}</div>`));
  if (s.mapa?.length) rows.push(row('Mapa', mapaChips(S, s.mapa)));
  const fq = S.tags.faqs.filter(f => f.pasajes.some(x => x.ref === s.id));
  if (fq.length) rows.push(row('FAQ', fq.map(f => `<div><a class="lk" href="${href('faq', f.id)}">${esc(f.pregunta)}</a></div>`).join('')));
  rows.push(refsBlock(S, s.bk_n[0], s.bk_n[1], 'Otros vínculos en los grafos'));
  return `<article class="card${hl ? ' hl' : ''}" id="sub-${esc(s.id)}"><div class="ch"><a class="lk strong" href="${href('unidad', [u.id, s.id])}">${esc(s.bekker.join('–'))}</a><span>${esc(s.titulo)}</span>${pill(s.estado)}${s.estado_textual === 'corchete' ? '<span class="pill corchete" title="Solo se registra; no se discute">Corchete en la edición</span>' : ''}</div>${rows.join('')}</article>`;
}
// Articulación de la unidad (D26): claves de lectura y momentos del argumento, cada uno con sus sub-unidades
function articulacion(S, u) {
  const a = u.articulacion, SB = Object.fromEntries(u.subunidades.map(s => [s.id, s]));
  const cl = (a.claves || []).map(id => { const x = S.CLV[id]; if (!x) return `<div class="warn">Clave inexistente: ${esc(id)}</div>`;
    const n = Object.values(S.SUB).filter(s => (s.claves || []).some(z => z.k === id)).length;
    return `<div class="clvb"><div>${claveTag(S, id)} <b>${esc(x.nombre)}</b> <span class="sub">· aporta ${esc(x.aporta)}</span> ${vb(x.voz)} <span class="sub small">· ${n} sub-unidades</span></div><div class="mt4">${esc(x.t)}</div><div class="sub small">${esc(x.ref)}</div></div>`; }).join('');
  const mo = (a.momentos || []).map(m => `<li class="mom"><div><span class="momn">${esc(m.id)}</span> <b>${esc(m.titulo)}</b></div><div class="small">${esc(m.t)}</div><div class="msubs2">${m.subs.map(id => SB[id] ? `<a class="lk small" href="${href('unidad', [u.id, id])}">${esc(SB[id].bekker.join('–'))}</a>${(SB[id].claves || []).map(z => ` <span class="kb clvk" title="${esc(S.CLV[z.k]?.nombre || z.k)}">${esc(S.CLV[z.k]?.label || z.k)}</span>`).join('')}` : `<span class="warn">${esc(id)}</span>`).join(' · ')}</div></li>`).join('');
  return sec('Articulación') + `<div class="block artic">${a.t ? `<p class="mt0">${esc(a.t)} ${vb(a.voz)}</p>` : ''}${cl ? `<div class="claves">${cl}</div>` : ''}${mo ? `<h4 class="mt8">Momentos (${a.momentos.length})</h4><ol class="moms">${mo}</ol>` : ''}</div>`;
}
export function render(S, r) {
  const U = S.tags.unidades, u = S.U[r.args[0]] || U[0], sub = r.args[1] && S.SUB[r.args[1]] ? r.args[1] : null;
  const side = `<h3>Unidades del libro I (${U.length})</h3><div class="ulist">${U.map(x => `<a class="ub${x.id === u.id ? ' sel' : ''}" href="${href('unidad', x.id)}"${x.id === u.id ? ' aria-current="page"' : ''}><b>${esc(x.titulo)}</b><small>${x.tramos.map(t => t.join('–')).join(' + ')} · §${x.parrafos[0]}–${x.parrafos.at(-1)} · ${ST[x.estado]}${x.subunidades.length ? ' · ' + x.subunidades.length + ' sub-unidades' : ''}</small></a>`).join('')}</div>`;
  const opts = U.map(x => `<option value="${href('unidad', x.id)}"${x.id === u.id ? ' selected' : ''}>${esc(x.titulo)} · ${ST[x.estado]}</option>`).join('');
  let h = crumbs(S, u, sub && S.SUB[sub]) + `<div class="ph"><h2>${esc(u.titulo)}</h2>${pill(u.estado)}${u.grafo ? grafoBtn({file: u.grafo.file, title: u.grafo.label, cls: 'btn', txt: 'Abrir grafo'}) : ''}<span class="pager">${fzCtl()}</span></div>
   <div class="block">${row('Tramos', u.tramos.map(t => t.join('–')).join(' + ') + (u.tramos.length > 1 ? ' <span class="sub">· unidad no continua</span>' : ''), 'first')}
   ${row('Párrafos', u.parrafos.map(n => `<a class="lk" href="${href('parrafo', n)}">§${n}</a>`).join(' · '))}
   ${row('Resumen', esc(u.resumen))}
   ${u.grafo ? row('Grafo', `${grafoBtn({file: u.grafo.file, title: u.grafo.label})} · <span class="sub">${esc(u.grafo.file)}</span>`) : ''}
   ${S.tags.faqs.filter(f => f.pasajes.some(x => x.ref === 'u:' + u.id)).map(f => row('FAQ', `<a class="lk" href="${href('faq', f.id)}">${esc(f.pregunta)}</a>`)).join('')}</div>`;
  if (u.articulacion) h += articulacion(S, u);
  h += sec(`Sub-unidades (${u.subunidades.length})`);
  const MO = Object.fromEntries((u.articulacion?.momentos || []).map(m => [m.subs[0], m]));
  h += u.subunidades.length ? u.subunidades.map(s => (MO[s.id] ? `<h4 class="momh" id="mom-${esc(MO[s.id].id)}"><span class="momn">${esc(MO[s.id].id)}</span> ${esc(MO[s.id].titulo)} <span class="sub small">· ${esc(MO[s.id].t)}</span></h4>` : '') + subCard(S, s, u, s.id === sub)).join('') : `<div class="empty">Esbozo: las sub-unidades se definen cuando lleguemos a estos párrafos.</div>`;
  return {aside: side, mobile: `<select class="mobsel" aria-label="Elegir unidad" data-nav>${opts}</select>`, html: h, title: u.titulo, focus: sub ? 'sub-' + sub : null};
}
