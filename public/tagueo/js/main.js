// Arranque: carga datos, valida, monta el router y delega eventos.
import { load, parStatus, ultimoCapituloTagueado } from './store.js';
import { validar } from './validar.js';
import { createRouter } from './router.js';
import { initModal, openGraph } from './grafos.js';
import { esc } from './ui.js';
import * as texto from './views/texto.js';
import * as estatico from './views/estatico.js';
import * as funcional from './views/funcional.js';
import { toggle } from './views/tree.js';
import { href } from './router.js';
import * as unidades from './views/unidades.js';
import * as faq from './views/faq.js';
import * as mapa from './views/mapa.js';
import * as decisiones from './views/decisiones.js';
import * as tradicion from './views/tradicion.js';
import * as control from './views/control.js';

const $ = s => document.querySelector(s);
const arbol = {render: (S, r) => ({redirect: href('estatico', r.args)})}; // rutas viejas #/arbol/…
const views = {parrafo: texto, estatico, funcional, arbol, unidad: unidades, mapa, faq, tradicion, decisiones, control};
const mobile = () => matchMedia('(max-width:820px)').matches;
let S, router;

function header() {
  const limite = ultimoCapituloTagueado(S);
  $('#ver').textContent = `${S.tags.version} · texto ${S.tags.texto_base} · ${limite ? `alcance de tagueo hasta capítulo ${limite}` : 'sin párrafos tagueados'}`;
  const scope = S.pars.filter(p => p.cap <= limite), st = scope.map(p => parStatus(S, p.nro));
  const conf = st.filter(s => s === 'confirmado').length, prop = st.filter(s => s === 'propuesto' || s === 'discusion').length, tot = scope.length;
  $('#prog').innerHTML = `<span>${conf} confirmados · ${prop} propuestos · ${tot - conf - prop} sin revisar (de ${tot})</span>
    <div class="bar" role="img" aria-label="${conf} confirmados y ${prop} propuestos de ${tot} párrafos"><span style="width:${tot ? conf / tot * 100 : 0}%;background:var(--green)"></span><span style="width:${tot ? prop / tot * 100 : 0}%;background:var(--orange)"></span></div>`;
  const e = S.control.errs.length;
  $('#ctlbadge').outerHTML = `<span id="ctlbadge" class="badge ${e ? 'bad' : 'good'}" title="${e ? e + ' errores' : 'sin errores'}">${e || '✓'}</span>`;
}
function mount(view, r, same) {
  const out = view.render(S, r);
  if (out.redirect) { location.replace(out.redirect); return; }
  const main = $('#view'), oldAside = main.querySelector('aside'), oldScroll = main.querySelector('.content,.single');
  const asideTop = same && oldAside ? oldAside.scrollTop : 0, contTop = oldScroll ? oldScroll.scrollTop : 0;
  main.innerHTML = out.aside != null
    ? `<aside aria-label="Navegación de la sección">${out.aside}</aside><div class="content">${out.mobile || ''}<div class="wrap">${out.html}</div></div>`
    : `<div class="single"><div class="wrap">${out.html}</div></div>`;
  const aside = main.querySelector('aside'), cont = main.querySelector('.content,.single');
  if (aside) { aside.scrollTop = asideTop; const s = aside.querySelector('.sel'); if (!same && s) s.scrollIntoView({block: 'center'}); }
  if (out.focus && document.getElementById(out.focus)) document.getElementById(out.focus).scrollIntoView({block: 'start'});
  else cont.scrollTop = (same && (out.keepScroll && !mobile() || r._keep)) ? contTop : 0;
  document.querySelectorAll('nav.tabs a').forEach(a => a.toggleAttribute('aria-current', a.dataset.sec === r.sec));
  if (r.sec === 'parrafo') $('nav.tabs a[data-sec=parrafo]').href = location.hash;
  document.title = `${out.title || ''} · EN I · Tagueo`;
  syncFz(fz);
}
// Tamaño de la letra del texto (traducción y griego): escala guardada en el navegador
const FZ = {min: 0.8, max: 1.8, step: 0.1, key: 'tagueo.fz'};
function setFz(v) {
  v = Math.round(Math.min(FZ.max, Math.max(FZ.min, v)) * 10) / 10;
  document.documentElement.style.setProperty('--fz', v);
  try { localStorage.setItem(FZ.key, v); } catch (_) {}
  return syncFz(v);
}
// el control se dibuja con cada vista (ui/fzCtl): actualizar todos los que haya
function syncFz(v) {
  document.querySelectorAll('.fzv').forEach(o => o.textContent = `${Math.round(v * 100)} %`);
  document.querySelectorAll('.fzbar [data-d="-1"]').forEach(b => b.disabled = v <= FZ.min);
  document.querySelectorAll('.fzbar [data-d="1"]').forEach(b => b.disabled = v >= FZ.max);
  return v;
}
let fz = setFz(+(() => { try { return localStorage.getItem(FZ.key); } catch (_) { return null; } })() || 1);
document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]'); if (!t) return;
  if (t.dataset.action === 'ir') document.getElementById(t.dataset.target)?.scrollIntoView({block: 'start'});
  if (t.dataset.action === 'fz') fz = setFz(fz + +t.dataset.d * FZ.step);
  if (t.dataset.action === 'tg') { toggle(t.dataset.tree, t.dataset.id); const c = router.current(); c._keep = true; router.rerender(); c._keep = false; }
  if (t.dataset.action === 'grafo') openGraph({file: t.dataset.file, node: t.dataset.node, edge: t.dataset.edge, title: t.dataset.title, sub: t.dataset.sub});
});
document.addEventListener('change', e => { if (e.target.matches('select[data-nav]')) location.hash = e.target.value; });

(async () => {
  try { S = await load(); }
  catch (err) {
    $('#view').innerHTML = `<div class="single"><div class="wrap"><div class="warn">No se pudieron cargar los datos: ${esc(err.message)}.<br>La app necesita servirse por HTTP (por ejemplo desde Express, en <code>/tagueo/</code>); abierta como archivo local, el navegador bloquea la lectura de los datos.</div></div></div>`;
    return;
  }
  S.control = validar(S);
  initModal(S.revision); header();
  router = createRouter({views, fallback: '#/parrafo/1', mount});
  router.start();
})();
