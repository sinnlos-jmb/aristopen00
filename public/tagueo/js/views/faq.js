import { esc, pill, fLink, defHtml, vb } from '../ui.js';
import { href } from '../router.js';
import { CONFIG } from '../config.js';
// firmas (D35, D41): objetos por id → etiqueta con enlace
function objHtml(S, o) {
  const [tp, id] = String(o).split(/:(.*)/s);
  if (tp === 'func' && S.FN[id]) return `<a class="kb" href="${href('funcional', id)}" title="Nodo del funcional">${esc(S.FN[id].label)}</a>`;
  if (tp === 'static' && S.N[id]) return `<a class="kb" href="${href('estatico', id)}" title="Concepto del estático">${esc(S.N[id].label)}</a>`;
  if (tp === 'sense') { const [c, x] = id.split('#'), z = (S.N[c]?.sentidos || []).find(y => y.id === x); if (z) return `<a class="kb" href="${href('estatico', c)}" title="Sentido del estático">${esc(S.N[c].label)} · ${esc(z.label)}</a>`; }
  if (tp === 'fedge') { const e = S.FE.find(y => y.id === id); if (e) return `<a class="kb" href="${href('funcional', e.de)}" title="Arista del funcional">${esc(S.FN[e.de]?.label || e.de)} → ${esc(S.FN[e.a]?.label || e.a)}</a>`; }
  return `<span class="warn">${esc(o)}</span>`;
}
const firmas = (S, f) => f.firmas?.length ? `<details class="fird mt6"><summary><span class="pk">Firmas</span> ${f.firmas.length} · cómo la encuentra el buscador</summary>${f.firmas.map(x => `<div class="fir"><b>${esc(CONFIG.intenciones[x.intent]?.[0] || x.intent)}</b> ${(x.arguments || []).map(o => objHtml(S, o)).join(' ')}${x.operation ? ` <span class="sub small">· ${esc(CONFIG.operaciones[x.operation] || x.operation)}</span>` : ''}${x.label ? ` <span class="small">«${esc(x.label)}»</span>` : ''}${x.context ? `<div class="sub small">${esc(x.context)}</div>` : ''}</div>`).join('')}</details>` : '';
const respuesta = (S, f, sel) => f.respuesta?.length ? `<details class="resd mt6"${f.id === sel ? ' open' : ''}><summary><span class="pk">Respuesta</span> en borrador · ${f.respuesta.length} afirmaciones</summary><ol class="resp">${f.respuesta.map(x => { const s = x.sub && S.SUB[x.sub];
  return `<li>${vb(x.voz)} ${esc(x.t)} <span class="sub small">${s ? `<a class="lk" href="${href('unidad', [s.unidad, s.id])}">${esc(x.ref)}</a>` : esc(x.ref)} · ${esc(x.rol)}</span></li>`; }).join('')}</ol></details>` : '';
function refLink(S, x) {
  if (x.ref.startsWith('u:')) { const u = S.U[x.ref.slice(2)]; return `<a class="lk" href="${href('unidad', x.ref.slice(2))}">Unidad: ${esc(u ? u.titulo : x.ref)} · ${esc(x.rol)}</a>`; }
  const s = S.SUB[x.ref]; return s ? `<a class="lk" href="${href('unidad', [s.unidad, s.id])}">${esc(s.bekker.join('–'))} · ${esc(s.titulo)} · ${esc(x.rol)}</a>` : `<span class="warn">${esc(x.ref)} (no existe)</span>`;
}
const lugar = (S, a) => a ? `${esc(a.cat)}. ${esc(S.FN[a.cat]?.label || a.cat)} › ${esc(S.FN[a.nodo]?.label || a.nodo)}` : 'sin ubicar';
const item = (S, f, sel) => `<div class="faqi${f.id === sel ? ' hl' : ''}" id="faq-${esc(f.id)}"><h4>${esc(f.pregunta)}</h4><div class="v">Variantes: ${f.variantes.map(esc).join(' · ')}</div><div class="refs">${f.pasajes.map(x => refLink(S, x)).join('')}</div>${f.definicion && S.DEF[f.definicion] ? `<details class="defd mt6"${f.id === sel ? ' open' : ''}><summary><span class="pk">Definición por etapas</span> ${esc(S.DEF[f.definicion].titulo || '')} · ${S.DEF[f.definicion].etapas.length} etapas</summary>${defHtml(S, S.DEF[f.definicion])}</details>` : ''}${respuesta(S, f, sel)}${firmas(S, f)}<div class="mt6">${pill(f.estado)}${f.tambien?.length ? ` <span class="sub small">También en: ${f.tambien.map(b => `<a class="lk" href="${href('funcional', b.nodo)}">${lugar(S, b)}</a>`).join(' · ')}</span>` : ''}</div></div>`;
const also = (S, f) => `<div class="faqi tamb"><span class="sub small">Ver también</span> <a class="lk" href="${href('faq', f.id)}">${esc(f.pregunta)}</a> <span class="sub small">(está en ${lugar(S, f.arbol)})</span></div>`;
// FAQ en árbol (D21): categoría › nodo del funcional › preguntas; «tambien» la muestra además en otro nodo
export function render(S, r) {
  const sel = r.args[0];
  const P = S.tags.pilares || [];
  const pil = P.length ? `<div class="block intro" id="faq-pilares"><h4>Pilares · ideas que se recuerdan a lo largo de la obra</h4>${P.map(x => `<div class="mt6"><b>${esc(x.label)}</b>${x.voz === 'nuestra' ? ` ${vb('nuestra')}` : ''}<p>${esc(x.t)}</p><div class="sub small">${esc(x.ref)}${x.faq ? ` · <a class="lk" href="${href('faq', x.faq)}">${esc(S.FAQ[x.faq]?.pregunta || x.faq)}</a>` : ''} · en ${Object.values(S.SUB).filter(s => (s.pilares || []).includes(x.id)).map(s => `<a class="lk" href="${href('unidad', [s.unidad, s.id])}">${esc(s.bekker.join('–'))}</a>`).join(', ')}</div></div>`).join('')}</div>` : '';
  const at = {}, sueltas = [];
  S.tags.faqs.forEach(f => {
    if (f.arbol && S.FN[f.arbol.nodo]) (at[f.arbol.nodo] ??= []).push({f}); else sueltas.push(f);
    (f.tambien || []).forEach(b => S.FN[b.nodo] && (at[b.nodo] ??= []).push({f, tamb: true}));
  });
  const cats = S.ftree.categorias.map(c => {
    const nodos = S.fids.filter(i => S.FN[i].depth > 1 && S.FN[i].path[0] === c.id && at[i]);
    const n = new Set(nodos.flatMap(i => at[i].filter(x => !x.tamb).map(x => x.f.id))).size;
    return `<section class="fcat" id="faqcat-${esc(c.id)}"><h3 class="sec">${esc(c.id)}. ${esc(c.label)} <span class="sub small">· ${n ? n + (n === 1 ? ' pregunta' : ' preguntas') : 'sin preguntas todavía'}</span></h3>
      ${nodos.map(i => `<div class="fnode"><div class="fnh">${fLink(S, i)}</div>${at[i].map(x => x.tamb ? also(S, x.f) : item(S, x.f, sel)).join('')}</div>`).join('')}</section>`;
  }).join('');
  const idx = `<div class="block faqidx"><b>Índice</b> ${S.ftree.categorias.map(c => `<button type="button" class="lk" data-action="ir" data-target="faqcat-${esc(c.id)}">${esc(c.id)}. ${esc(c.label)}</button>`).join(' · ')}</div>`;
  const h = `<div class="ph"><h2>FAQ</h2><span class="sub">${S.tags.faqs.length} preguntas · primera puerta del bot · ordenadas en el árbol del funcional (categoría › nodo) · remiten a sub-unidades o a unidades enteras</span></div>` + pil + idx + cats +
    (sueltas.length ? `<section class="fcat"><h3 class="sec">Sin ubicar</h3>${sueltas.map(f => item(S, f, sel)).join('')}</section>` : '');
  return {html: h, title: 'FAQ', focus: sel ? 'faq-' + sel : null};
}
