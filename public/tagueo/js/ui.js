// Piezas de interfaz comunes (devuelven HTML)
import { href } from './router.js';
import { mapaRef } from './store.js';
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
export const ST = {propuesto: 'Propuesto', confirmado: 'Confirmado', discusion: 'En discusión', esbozo: 'Esbozo', borrador: 'Borrador', none: 'sin revisar'};
export const VLAB = {textual: 'Textual', comentarista: 'Comentarista', nuestra: 'Lectura nuestra', traduccion: 'Traducción', endoxa: 'Éndoxon'};
export const KIND = {raiz: 'Raíz', categoria: 'Categoría', division: 'División', especie: 'Especie', parte: 'Parte', concepto: 'Concepto', compartido: 'Compartido', propio: 'Propio del funcional'};
export const RELP = {especie: 'especie de', parte: 'parte de', division: 'división de', agrupacion: 'agrupado en'};
export const VIA = {remite: 'remisión', compartido: 'nodo compartido', ancestro: 'ancestro compartido', sede: 'sede', en: 'sentido encuadrado en'};
export const ATR = {sede: 'Sede', esfera: 'Esfera', posicion: 'Posición', medio: 'Término medio', opuestos: 'Extremos opuestos', doble: 'También cuenta en', valoracion: 'Valoración (comentarista)', debate: 'Debate'};
export const NIV = {central: 'Central', presente: 'Presente', mencion: 'Mención'};
export const pill = (st, txt) => `<span class="pill ${st === 'esbozo' ? 'corchete' : st}">${esc(txt ?? ST[st] ?? st)}</span>`;
export const vb = v => `<span class="vb ${v}">${VLAB[v] || esc(v)}</span>`;
export const lab = (S, id) => S.N[id] ? S.N[id].label : id;
export const flab = (S, id) => S.FN[id] ? S.FN[id].label : id;
export const labText = (S, s) => esc(s).replace(/\b[a-z_]+\b/g, w => S.N[w] ? esc(S.N[w].label) : w);
export const sense = (S, c, s) => { const x = (S.N[c]?.sentidos || []).find(z => z.id === s); return x ? x.label : s; };
export const vozT = (S, v) => (v || []).map(x => esc(S.tree.voces_texto[x] || x)).join(' → ');
export const note = (n, S) => `<div class="note">${vb(n.voz)}<span>${n.bekker ? `<b class="bk">${esc(n.bekker)}</b> · ` : ''}${esc(n.t)}${S && n.c?.length ? ` <span class="ncs">${n.c.map(c => `<a class="kb" href="#/estatico/${encodeURIComponent(c)}" title="Concepto de la nota">${esc(S.N[c]?.label || c)}</a>`).join('')}</span>` : ''}${S && n.mapa?.length ? `<span class="mrefs">${mapaChips(S, n.mapa)}</span>` : ''}</span></div>`;
export const row = (k, v, cls = '') => `<div class="row ${cls}"><span>${k}</span><div>${v}</div></div>`;
export const sec = t => `<h3 class="sec">${t}</h3>`;
// Control de la letra del texto (D24): va junto a la paginación (Texto) y a la derecha del título (Unidades); main.js sincroniza valor y límites
export const fzCtl = () => `<span class="fzbar" role="group" aria-label="Tamaño de la letra del texto"><button type="button" data-action="fz" data-d="-1" aria-label="Achicar la letra" title="Achicar la letra">A−</button><output class="fzv" aria-live="polite">100 %</output><button type="button" data-action="fz" data-d="1" aria-label="Agrandar la letra" title="Agrandar la letra">A+</button></span>`;
export function grHtml(t) {
  return esc(t).replace(/\[([^\]]{12,}?)\]/g, '<span class="br" title="Corchetes de la edición: solo se registran">[$1]</span>')
    .replace(/\[(\d{1,2})\]/g, '<span class="ln">$1</span>')
    .replace(/(1\d\d\d[ab])(\s*\[1\])?/g, '<span class="ln">$1</span>');
}
// chip de concepto tagueado: enlaza al filtro de párrafos (o lo quita si ya está activo)
export function chip(S, k, nro, filtro, match) {
  const c = S.N[k.c] || {label: k.c, gr: ''}, on = filtro === k.c, m = !on && match && match.has(k.c);
  return `<a class="chip ${k.n}${k.implicito ? ' imp' : ''}${on ? ' on' : ''}${m ? ' match' : ''}" href="${href('parrafo', nro, on ? {} : {c: k.c})}" title="${esc(S.tree.niveles[k.n])}${esc(impTitle(k))} · ${on ? 'quitar filtro' : 'filtrar párrafos'}"><span>${esc(c.label)}</span><span class="g">${esc(c.gr)}</span>${k.s ? `<i>· ${esc(sense(S, k.c, k.s))}</i>` : ''}${impTag(k)}</a>`;
}
// implícito (D26/D27): el concepto no se nombra; se activa por una expresión del texto («vía») y una cita que lo respalda
// modo de activación (D28): con «recurso», la activación es indirecta (por analogía, πρὸς ἕν, metáfora…); se dice con palabras
export const RECP = {analogia: 'por analogía', pros_hen: 'por πρὸς ἕν', metafora: 'por metáfora', ejemplo: 'mediante un ejemplo', contraste: 'por contraste', paralelo: 'por un lugar paralelo'};
export const recTxt = k => k.recurso ? (RECP[k.recurso] || 'por ' + k.recurso) : '';
export const impTitle = k => k.implicito ? ` · implícito${k.recurso ? ` · activación indirecta, ${recTxt(k)}` : ''}${k.via ? ` · vía ${k.via}` : ''}${k.ref ? ` · ${k.ref}` : ''}` : '';
export const impTag = k => k.implicito ? `<i class="impt">· implícito${k.recurso ? ' · ' + esc(recTxt(k)) : k.via ? ' · vía' : ''}</i>` : '';
// clave de lectura (D26): etiqueta corta que remite al nodo del estático
export function claveTag(S, id) {
  const x = S.CLV?.[id]; if (!x) return `<span class="warn">Clave inexistente: ${esc(id)}</span>`;
  return `<a class="clv" href="${href('estatico', x.nodo)}" title="${esc(x.nombre)} · aporta ${esc(x.aporta)}"><span class="pk">Clave</span> <span class="g">${esc(x.label)}</span></a>`;
}
// lista de implícitos con vía (párrafo): concepto · vía (expresión del texto) · cita · claves
export const impList = (S, ks) => ks.map(k => `<div class="impr"><a class="lk" href="${href('estatico', k.c)}">${esc(lab(S, k.c))}${k.s ? ` <i>· ${esc(sense(S, k.c, k.s))}</i>` : ''}</a> <span class="sub small">(${esc((NIV[k.n] || k.n).toLowerCase())})</span>${k.recurso ? ` <span class="rec" title="${esc(S.REC?.[k.recurso]?.t || '')}">${esc(recTxt(k))}</span>` : ''} <span class="sub">vía</span> <span class="via">${esc(k.via)}</span>${k.ref ? ` <span class="sub small">· ${esc(k.ref)}</span>` : ''}${(k.claves || []).map(x => ' ' + claveTag(S, x)).join('')}</div>`).join('');
export const nodeLink = (S, id, extra = '') => `<a class="lk" href="${href('estatico', id)}">${esc(lab(S, id))}${extra}</a>`;
// enlace a un nodo o sentido del estático («id» o «id#sentido»)
export function refLink(S, r) {
  const [c, s] = r.split('#'), n = S.N[c]; if (!n) return esc(r);
  return `<a class="lk" href="${href('estatico', c)}">${esc(n.label)}${s ? ` <i>· ${esc(sense(S, c, s))}</i>` : ''} <span class="g">${esc(n.gr)}</span></a>`;
}
export const fLink = (S, id) => S.FN[id] ? `<a class="lk" href="${href('funcional', id)}">${esc(S.FN[id].label)} <span class="g">${esc(S.FN[id].gr || '')}</span></a>` : esc(id);
export const catHtml = c => c ? `<span class="g">${esc(c.gr)}</span> ${esc(c.label)}` : '<span class="sub">sin asignar</span>';
// trayecto funcional como cadena de pasos
export function pathHtml(S, from, steps, mark, hz = []) {
  if (!steps) return '<span class="sub">sin trayecto</span>';
  const H = new Set(hz);
  const ts = id => `<span class="tstep${id === mark ? ' tin' : ''}${H.has(id) ? ' hz' : ''}"${id === mark ? ' title="Entrada al molde"' : H.has(id) ? ' title="Horizonte: en el nivel introductorio queda atenuado"' : ''}>${esc(flab(S, id))}</span>`;
  if (!steps.length) return ts(from);
  const REL = S.ftree.relaciones_arista;
  return ts(from) + steps.map(st => {
    if (st.falta) return ` <span class="tarr warn">sin arista</span> ${ts(st.a)}`;
    const t = st.e ? `${st.dir > 0 ? '' : '← '}${esc(REL[st.e.rel] || st.e.rel)} <span class="g">${esc(st.e.label)}</span>${st.dir > 0 ? ' →' : ''}${st.e.voz === 'nuestra' ? ' <span class="kb nuestra">nuestra</span>' : ''}`
      : `<span class="sub">${st.dir > 0 ? 'incluye' : 'dentro de'}</span>`;
    const n = st.e?.nota_trayecto;
    const extra = n ? `<details class="tray-note"><summary>Nota</summary><div>${vb(n.voz)} ${esc(n.t)} <span class="sub small">${esc(n.ref)}</span>${n.sub ? ` · <a class="lk" href="${href('unidad', ['solon', n.sub])}">Ver pasaje</a>` : ''}</div></details>` : '';
    return ` <span class="tarr${H.has(st.a) ? ' hz' : ''}">${t}</span>${extra} ${ts(st.a)}`;
  }).join('');
}
// Molde de trayecto (store.molde): Phýsis se lee desde el polo; Lo divino, hacia el polo
// nota del molde + niveles de lectura (para la fila «Trayectos»)
export const moldeNota = S => `<div class="sub small">${esc(S.ftree.plantilla?.nota || '')}</div>${S.ftree.plantilla?.niveles ? `<div class="sub small niv"><span class="kb hzl">horizonte</span> ${esc(S.ftree.plantilla.niveles)}</div>` : ''}`;
export function moldeHtml(S, m, p, revSteps) {
  if (!m) return `<div class="tray"><b>${esc(S.ftree.plantilla?.[p]?.label || p)}</b> · <span class="sub">sin entrada</span></div>`;
  const desde = m.columna[0] === p, hz = S.ftree.plantilla?.[p]?.horizonte || [];
  const acc = !m.access.length ? '<span class="sub">el concepto está en el molde</span>'
    : desde ? pathHtml(S, m.entry, revSteps(m.access), null, hz) : pathHtml(S, m.f, m.access, null, hz);
  return `<div class="tray"><b>${esc(m.label)}</b> · ${pathHtml(S, m.columna[0], m.col, m.entry, hz)}${hz.length ? ` <span class="kb hzl" title="${esc(S.ftree.plantilla?.niveles || '')}">horizonte</span>` : ''}
    <div class="tacc"><span class="sub small">entra por ${esc(flab(S, m.entry))}${m.access.length ? ` desde ${esc(flab(S, m.f))}` : ''}:</span> ${acc}</div></div>`;
}

// pilar didáctico (idea que se recuerda a lo largo de la obra): enlaza a su FAQ
export const pilarHtml = (S, id) => { const x = S.PIL?.[id]; if (!x) return `<span class="warn">Pilar inexistente: ${esc(id)}</span>`;
  return `<a class="pil" href="${href('faq', x.faq || 'pilares')}" title="${esc(x.t)}"><span class="pk">Pilar</span> ${esc(x.label)}${x.voz === 'nuestra' ? ` ${vb('nuestra')}` : ''}</a>`; };

// Definición por etapas (D22): una sola definición que se va precisando; «cur» resalta la etapa del lugar
export function defHtml(S, d, cur) {
  const r = d.referencia || {};
  const et = (d.etapas || []).map(e => `<li class="defe${e.n === cur ? ' cur' : ''}${e.nivel === 'avanzado' ? ' adv' : ''}"${e.n === cur ? ' aria-current="step"' : ''}><div><b>${esc(e.label)}</b> <span class="sub small">${esc(e.ref)}</span> <span class="sub small">· ${esc(S.tree.voces_texto[e.voz] || e.voz)}</span>${e.nivel === 'avanzado' ? ' <span class="kb hzl" title="Nivel avanzado">avanzado</span>' : ''}</div><div>${esc(e.t)}</div>${e.gr ? `<div class="g small" lang="grc">${esc(e.gr)}</div>` : ''}${e.a ? `<div>${mapaLink(S, e.a)}</div>` : ''}</li>`).join('');
  return `<div class="defl"><div class="defref"><span class="pk">Referencia</span> <b>${esc(r.t)}</b> <span class="sub small">${esc(r.ref)}</span>${r.nota ? `<div class="sub small">${esc(r.nota)}</div>` : ''}</div><ol>${et}</ol>${d.lectura ? `<div class="note">${vb(d.lectura.voz)}<span>${esc(d.lectura.t)}</span></div>` : ''}</div>`;
}
export const defChips = (S, sid) => (S.DEFSUB?.[sid] || []).map(({d, e}) => `<details class="defd"><summary><span class="pk">Definición</span> ${esc(lab(S, d.concepto))} · etapa ${e.n} de ${d.etapas.length}: ${esc(e.label)}</summary>${defHtml(S, d, e.n)}</details>`).join('');
// Mapa de la obra (D21): enlace a una unidad, sub-unidad o super-unidad
export function mapaLink(S, a) {
  const r = mapaRef(S, a); if (!r) return `<span class="warn">Mapa: ${esc(a)} no existe</span>`;
  const {kind, id, obj} = r;
  const [h, txt] = kind === 'unidad' ? [href('unidad', id), `Unidad · ${obj.titulo}`]
    : kind === 'sub' ? [href('unidad', [obj.unidad, id]), `${obj.bekker.join('–')} · ${obj.titulo}`]
    : [href('mapa', id), `${id} · ${obj.titulo} (${obj.libros.length > 1 ? 'libros ' + obj.libros[0].n + '–' + obj.libros.at(-1).n : 'libro ' + obj.libros[0].n})`];
  return `<a class="mref ${kind}" href="${h}"><span class="mk">Mapa</span>${esc(txt)}</a>`;
}
export const mapaChips = (S, xs) => xs.map(m => `<div class="mrow">${mapaLink(S, m.a)}${m.t ? ` <span class="sub small">${esc(m.t)}</span>` : ''}</div>`).join('');
// migas automáticas: Mapa › super-unidad › libro › unidad (› sub-unidad)
export function crumbs(S, u, s) {
  const X = S.SUPER_LIBRO, L = S.tags.mapa?.libro_tagueado;
  if (!X) return '';
  return `<nav class="crumb mapcrumb" aria-label="Lugar en la obra"><a href="${href('mapa')}">Mapa</a> › <a href="${href('mapa', X.id)}">${esc(X.id)} · ${esc(X.titulo)}</a> › <a href="${href('mapa', X.id)}">Libro ${esc(L)}</a> › <a href="${href('unidad', u.id)}"${s ? '' : ' aria-current="page"'}>${esc(u.titulo)}</a>${s ? ` › <a href="${href('unidad', [u.id, s.id])}" aria-current="page">${esc(s.bekker.join('–'))}</a>` : ''}</nav>`;
}

// Voces de la tradición (D36): referencia breve (tipo, fuente y primer verso) que lleva a su tarjeta
export const TRTIPO = {verso: 'Verso', epigrama: 'Epigrama', proverbio: 'Proverbio', dicho: 'Dicho', anecdota: 'Anécdota'};
export const TRUSO = {autoridad: 'autoridad', confirmacion: 'confirmación', contraste: 'contraste', ejemplo: 'ejemplo', relectura: 'relectura'};
export const fuenteTxt = f => [f?.autor, f?.obra, f?.loc].filter(Boolean).join(', ');
export const tradChip = x => `<div class="trc"><a class="lk" href="#/tradicion/${encodeURIComponent(x.id)}"><span class="trk">${esc(TRTIPO[x.tipo] || x.tipo)}</span> ${esc(fuenteTxt(x.fuente))}</a> <span class="g">${esc((x.gr || '').split('\n')[0])}</span> <span class="sub small">· ${esc(TRUSO[x.uso] || x.uso)}</span></div>`;
