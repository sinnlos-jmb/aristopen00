import { esc, lab, sec } from '../ui.js';
import { href } from '../router.js';
export function render(S) {
  const C = S.control, TIT = {ok: 'Presente en los tags del párrafo', pendiente: 'El párrafo aún no tiene tags v3', falta: 'No figura en los tags del párrafo'};
  const bySub = {}; C.coh.forEach(x => (bySub[x.sub] ??= []).push(x));
  const coh = Object.entries(bySub).map(([id, xs]) => `<div class="mt6"><a class="lk" href="${href('unidad', [S.SUB[id].unidad, id])}">${esc(id)} · ${esc(S.SUB[id].titulo)}</a><div class="cohs">${xs.map(x => `<span class="coh ${x.st}" title="${TIT[x.st]}">${esc(lab(S, x.c))} · §${x.p} · ${x.st}</span>`).join('')}</div></div>`).join('');
  const h = `<div class="ph"><h2>Control</h2><span class="sub">Validaciones calculadas en el navegador al cargar los datos · también por consola: <code>node tools/validar-tagueo.mjs</code></span></div>`
    + C.errs.map(e => `<div class="warn">${esc(e)}</div>`).join('') + C.warns.map(e => `<div class="avis">${esc(e)}</div>`).join('') + C.oks.map(e => `<div class="okm">${esc(e)}</div>`).join('')
    + sec('Coherencia: conceptos clave de cada sub-unidad en los tags de su párrafo') + coh;
  return {html: h, title: 'Control'};
}
