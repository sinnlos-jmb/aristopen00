// Voces de la tradición (D36): versos, epigramas, proverbios y dichos que Aristóteles toma de otros, con una lectura nuestra.
import { esc, pill, row, vb, grHtml, lab, mapaChips, TRTIPO, TRUSO, fuenteTxt } from '../ui.js';
import { href } from '../router.js';

function card(S, x, sel) {
  const s = x.sub && S.SUB[x.sub];
  const rows = [];
  rows.push(`<div class="texts mt8"><div><h4>Versión</h4><div class="es" lang="es">${esc(x.es || '—')}</div>${x.es_libre ? `<h4 class="mt8">Versión libre</h4><div class="es" lang="es">${esc(x.es_libre)}</div>` : ''}</div><div><h4>Griego</h4><div class="gr" lang="grc">${grHtml(x.gr || '—')}</div></div></div>`);
  rows.push(row('Dónde', `${esc(x.ref)}${s ? ` · <a class="lk" href="${href('unidad', [s.unidad, s.id])}">${esc(s.bekker.join('–'))} · ${esc(s.titulo)}</a>${s.pars.map(n => ` · <a class="lk" href="${href('parrafo', n)}">§${n}</a>`).join('')}` : x.fuera ? ' <span class="sub small">· fuera del libro I</span>' : ''}`));
  rows.push(row('Uso', `${esc(TRUSO[x.uso] || x.uso)} ${vb(x.voz)}`));
  if (x.lectura) rows.push(row('Lectura', `<p class="mt0 trl">${esc(x.lectura)}</p> ${vb('nuestra')}`));
  if (x.nota) rows.push(row('Nota', esc(x.nota)));
  if (x.c?.length) rows.push(row('Conceptos', x.c.map(c => `<a class="chip" href="${href('estatico', c)}"><span>${esc(lab(S, c))}</span><span class="g">${esc(S.N[c]?.gr || '')}</span></a>`).join('')));
  if (x.vinculos?.length) rows.push(row('Vínculos', mapaChips(S, x.vinculos)));
  return `<article class="card trad${x.id === sel ? ' hl' : ''}" id="tr-${esc(x.id)}"><div class="ch"><span class="trk">${esc(TRTIPO[x.tipo] || x.tipo)}</span><b>${esc(fuenteTxt(x.fuente))}</b>${pill(x.estado)}</div>${rows.join('')}</article>`;
}
export function render(S, r) {
  const L = S.tags.tradicion || [], sel = r.args[0];
  const pos = x => S.SUB[x.sub]?.bk_n?.[0] ?? Infinity;
  const dentro = L.filter(x => !x.fuera).sort((a, b) => pos(a) - pos(b)), fuera = L.filter(x => x.fuera);
  const h = `<div class="ph"><h2>Voces de la tradición</h2><span class="sub">${L.length} voces · ${dentro.length} en el libro I · ${fuera.length} fuera del libro</span></div>
    <div class="block intro"><p class="mt0">Versos, epigramas, proverbios y dichos que Aristóteles toma de otros. Cada voz va con su fuente, el griego, una versión cuidada y una lectura nuestra, en un registro más cálido, que cambia la coloración de la lectura (D36). Más adelante, interludios del bot.</p></div>
    ${dentro.length ? `<h3 class="momh">En el libro I</h3>${dentro.map(x => card(S, x, sel)).join('')}` : '<div class="empty">Todavía no hay voces registradas.</div>'}
    ${fuera.length ? `<h3 class="momh">Fuera del libro I <span class="sub">· citas de otros lugares que iluminan la lectura</span></h3>${fuera.map(x => card(S, x, sel)).join('')}` : ''}`;
  return {html: h, title: 'Tradición', focus: sel ? 'tr-' + sel : null};
}
