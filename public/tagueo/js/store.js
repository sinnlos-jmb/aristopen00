// Carga de datos e índices. build() es puro (sin DOM ni fetch) para poder usarlo desde Node.
import { parseTexto, bkNum } from './texto.js';
import { CONFIG } from './config.js';

export async function load() {
  const r = await fetch('/api/labo/lectura', {cache:'no-store'});
  if (!r.ok) {
    let message; try { message=(await r.json()).error; } catch {}
    throw new Error(message || `No se pudieron cargar las fuentes (${r.status}).`);
  }
  const {revision,txt,estatico,funcional,tags,refs,graphIndex}=await r.json();
  if (!revision || typeof txt!=='string' || !txt.trim() || !estatico?.raices || !funcional?.categorias || !funcional?.aristas || !tags?.unidades || !tags?.faqs || !Array.isArray(refs?.entradas) || !Array.isArray(graphIndex) || !graphIndex.length)
    throw new Error('El servidor devolvió fuentes incompletas para el tagueo.');
  const S=build({txt,estatico,funcional,tags,refs,graphIndex});
  S.revision=revision;
  return S;
}
export function parseGraphIndex(js) {
  const m = /const GRAPH_INDEX\s*=\s*(\[[\s\S]*?\]);/.exec(js);
  return m ? JSON.parse(m[1]) : null;
}
const KINDS = {especie: 'especie', parte: 'parte', division: 'division'};

export function build({txt, estatico, funcional, tags, refs, graphIndex}) {
  const S = {tree: estatico, ftree: funcional, tags, pars: parseTexto(txt)};
  S.P = Object.fromEntries(S.pars.map(p => [p.nro, p]));
  // ---- árbol estático: contra él se taguea ----
  S.N = {}; S.ids = [];
  const walk = (n, path, depth, cat) => {
    S.ids.push(n.id);
    const {hijos, ...rest} = n, own = n.categoria, c = own ? {...own, de: n.id} : cat;
    const kind = depth === 0 ? 'raiz' : (KINDS[n.rel] || 'concepto');
    S.N[n.id] = {...rest, path, depth: depth + 1, kind, cat: c, catPropia: !!own, hijos: (hijos || []).map(h => h.id)};
    (hijos || []).forEach(h => walk(h, [...path, n.id], depth + 1, c));
  };
  estatico.raices.forEach(c => walk(c, [], 0, null));
  // ---- red funcional: nodos compartidos (mismo id) o propios con remisiones ----
  S.FN = {}; S.fids = [];
  const fwalk = (n, path, depth) => {
    S.fids.push(n.id);
    const {hijos, ...rest} = n;
    const kind = depth === 0 ? 'categoria' : (S.N[n.id] ? 'compartido' : 'propio');
    S.FN[n.id] = {...rest, path, depth: depth + 1, kind, hijos: (hijos || []).map(h => h.id)};
    (hijos || []).forEach(h => fwalk(h, [...path, n.id], depth + 1));
  };
  funcional.categorias.forEach(c => fwalk(c, [], 0));
  S.FE = funcional.aristas;
  S.REM = {};
  Object.values(S.FN).forEach(f => (f.remite_a || []).forEach(r => (S.REM[r] ??= []).push(f.id)));
  // grafo de trayectos: aristas funcionales + vínculos del árbol funcional (sin pasar por las categorías)
  S.ADJ = {};
  const link = (a, b, step) => (S.ADJ[a] ??= []).push({to: b, ...step});
  S.FE.forEach(e => { link(e.de, e.a, {e, dir: 1}); link(e.a, e.de, {e, dir: -1}); });
  Object.values(S.FN).forEach(f => { const p = f.path.at(-1); if (p && S.FN[p].depth > 1) { link(p, f.id, {arbol: f.rel, dir: 1}); link(f.id, p, {arbol: f.rel, dir: -1}); } });
  S._anc = {};
  // ---- párrafos, unidades, FAQ ----
  S.TP = Object.fromEntries(tags.parrafos.map(p => [p.parrafo, p]));
  S.U = Object.fromEntries(tags.unidades.map(u => [u.id, u]));
  S.FAQ = Object.fromEntries(tags.faqs.map(f => [f.id, f]));
  S.PIL = Object.fromEntries((tags.pilares || []).map(x => [x.id, x]));
  // claves de lectura (D26): registro y momentos de la articulación de cada unidad (sub-unidad → momento)
  S.CLV = Object.fromEntries((tags.claves || []).map(x => [x.id, x]));
  // recursos de activación indirecta (D28)
  S.REC = Object.fromEntries((tags.recursos || []).map(x => [x.id, x]));
  // voces de la tradición (D36): citas que Aristóteles toma de otros, por id y por sub-unidad
  S.TRAD = Object.fromEntries((tags.tradicion || []).map(x => [x.id, x]));
  S.TRADSUB = {};
  (tags.tradicion || []).forEach(x => { if (x.sub) (S.TRADSUB[x.sub] ??= []).push(x); });
  S.MOM = {};
  tags.unidades.forEach(u => (u.articulacion?.momentos || []).forEach(m => (m.subs || []).forEach(id => { S.MOM[id] = {u, m}; })));
  // definiciones por etapas (D22): por concepto y por sub-unidad (etapa con «a: sub:…» o «subs»)
  S.DEF = Object.fromEntries((tags.definiciones || []).map(d => [d.id, d]));
  S.DEFC = {}; S.DEFSUB = {};
  Object.values(S.DEF).forEach(d => { (S.DEFC[d.concepto] ??= []).push(d);
    (d.etapas || []).forEach(e => [e.a?.startsWith('sub:') ? e.a.slice(4) : null, ...(e.subs || [])].filter(Boolean).forEach(id => (S.DEFSUB[id] ??= []).push({d, e}))); });
  // mapa de la obra (D21): super-unidades que agrupan libros; el libro tagueado contiene las unidades
  S.SUPER = Object.fromEntries((tags.mapa?.super_unidades || []).map(x => [x.id, x]));
  S.SUPER_LIBRO = Object.values(S.SUPER).find(x => x.libros.some(l => l.n === tags.mapa?.libro_tagueado)) || null;
  S.SUB = {};
  tags.unidades.forEach(u => {
    const gt = Object.fromEntries(u.parrafos.map(n => [n, S.P[n]?.gr || ''])), et = Object.fromEntries(u.parrafos.map(n => [n, S.P[n]?.es || '']));
    u.subunidades.forEach(s => {
      const g = locate(gt, u.parrafos, s.gr_ancla?.inicio, s.gr_ancla?.fin), e = locate(et, u.parrafos, s.es_ancla?.inicio, s.es_ancla?.fin);
      const sp = g.span || e.span;
      S.SUB[s.id] = Object.assign(s, {unidad: u.id, gr_txt: g.text, es_txt: e.text,
        anclas_rotas: [g.err && 'griego, ' + g.err, e.err && 'castellano, ' + e.err].filter(Boolean),
        pars: sp ? range(sp[0], sp[1]) : [], bk_n: [bkNum(s.bekker[0]), bkNum(s.bekker[1])]});
    });
  });
  // tramo Bekker de cada párrafo: precisa con las sub-unidades que empiezan en él; si no, aproximado por las marcas del griego
  S.pars.forEach(p => { const st = Object.values(S.SUB).filter(s => s.pars[0] === p.nro).map(s => s.bk_n[0]); p.bk_a = st.length ? Math.min(...st) : p.bk_ini_n; });
  S.pars.forEach((p, i) => { const nx = S.pars[i + 1]; p.bk_b = nx ? Math.max(p.bk_a, nx.bk_a - 1) : p.bk_fin_n; });
  S.usage = {};
  tags.parrafos.forEach(p => p.conceptos.forEach(k => (S.usage[k.c] ??= []).push({p: p.parrafo, n: k.n, s: k.s})));
  // cobertura del funcional: qué conceptos (y sentidos) del estático se anclan en cada nodo funcional
  S.COV = {};
  Object.values(S.N).forEach(n => [null, ...(n.sentidos || []).map(x => x.id)].forEach(s => anchorsOf(S, n.id, s).forEach(a => (S.COV[a.f] ??= []).push({c: n.id, s, via: a.via}))));
  S.fusage = {};
  tags.parrafos.forEach(p => p.conceptos.forEach(k => anchorsOf(S, k.c, k.s).forEach(a => { const u = (S.fusage[a.f] ??= []); if (!u.some(x => x.p === p.parrafo)) u.push({p: p.parrafo}); })));
  // ---- grafos (índice de referencias de la etapa 1) ----
  S.graphs = (graphIndex || []).map(g => ({id: g.id, file: g.file, label: g.label}));
  // en: rangos Bekker de la EN en la referencia principal; encf: en las referencias de cotejo (ref_cf, D42)
  const enOf = rs => (rs || []).filter(r => r.work === 'EN' && r.level === 'Bekker')
    .flatMap(r => r.ranges.map(g => [bkNum(g.start), bkNum(g.end) ?? bkNum(g.start)])).filter(r => r[0] != null);
  S.refs = refs ? refs.entradas.map(x => ({...x, en: enOf(x.refs), encf: enOf(x.refs_cf),
    ...(x.kind === 'nodo' ? {cid: x.concepto || x.conceptId || x.id} : {})})) : null;
  S.VG = Object.fromEntries((tags.voces_grafos || []).map(v => [`${v.file}|${v.edge}`, v]));
  S.refById = {};
  (S.refs || []).forEach(x => S.refById[`${x.file}|${x.kind}|${x.id}`] = x);
  return S;
}
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
function locate(byPar, nros, ini, fin) {
  if (!ini || !fin) return {err: 'sin ancla'};
  let joined = ''; const offs = [];
  nros.forEach(n => { offs.push([joined.length, n]); joined += byPar[n] + '\n'; });
  let a = joined.indexOf(ini), b = a < 0 ? -1 : joined.indexOf(fin, a);
  if (a >= 0 && b >= 0) b += fin.length;
  else {
    // Los números Bekker interrumpen a veces una frase presente en el ancla.
    // Solo se ignoran esas marcas y se compactan espacios; se conserva el texto original.
    const normalize = input => {
      let value = '', offsets = [], i = 0;
      while (i < input.length) {
        const mark = input.slice(i).match(/^\[\d+\]/);
        if (mark) { i += mark[0].length; continue; }
        const ch = input[i];
        if (/\s/.test(ch)) {
          if (value && !value.endsWith(' ')) { value += ' '; offsets.push(i); }
        } else { value += ch; offsets.push(i); }
        i++;
      }
      return {value, offsets};
    };
    const full = normalize(joined), start = normalize(ini).value.trim(), end = normalize(fin).value.trim();
    const ni = full.value.indexOf(start); if (ni < 0) return {err: 'inicio'};
    const nf = full.value.indexOf(end, ni); if (nf < 0) return {err: 'fin'};
    a = full.offsets[ni]; b = full.offsets[nf + end.length - 1] + 1;
  }
  const pa = offs.filter(([o]) => o <= a).pop()[1], pb = offs.filter(([o]) => o < b).pop()[1];
  return {text: joined.slice(a, b), span: [pa, pb]};
}
// ---- anclaje en el funcional (lectura derivada) ----
// Orden: remisión por sentido, remisión del concepto, nodo compartido; si nada, el ancestro compartido más cercano.
// Se agregan la sede (parte del alma) y, para un sentido que «se encuadra en» otra rama, las anclas de esa rama («ver» no cuenta).
export function anchorsOf(S, c, s, deep = true) {
  const key = c + '#' + (s || ''); if (deep && S._anc[key]) return S._anc[key];
  const out = [], add = (f, via, de) => { if (S.FN[f] && S.FN[f].depth > 1 && !out.some(x => x.f === f)) out.push({f, via, de}); };
  const n = S.N[c]; if (!n) return out;
  // un sentido puede contarse sin anclar (giro idiomático, como πέφυκε)
  if (s && (n.sentidos || []).find(z => z.id === s)?.ancla === false) { if (deep) S._anc[key] = out; return out; }
  // la remisión del sentido, si existe, desplaza a la del concepto en general
  const rs = s && S.REM[c + '#' + s];
  if (rs) rs.forEach(f => add(f, 'remite', c + '#' + s)); else (S.REM[c] || []).forEach(f => add(f, 'remite', c));
  if (S.FN[c]) add(c, 'compartido', c);
  if (!out.length) for (const a of [...n.path].reverse()) {
    if (S.FN[a] && S.FN[a].depth > 1) { add(a, 'ancestro', a); break; }
    if (S.REM[a]) { S.REM[a].forEach(f => add(f, 'ancestro', a)); break; }
  }
  if (deep) {
    [].concat(n.atributos?.sede || []).forEach(x => anchorsOf(S, x, null, false).forEach(a => add(a.f, 'sede', x)));
    const v = s && (n.sentidos || []).find(z => z.id === s)?.en;
    if (v) { const [vc, vs] = v.split('#'); anchorsOf(S, vc, vs, false).forEach(a => add(a.f, 'en', v)); }
    S._anc[key] = out;
  }
  return out;
}
// Trayecto más corto (BFS no dirigido) desde un nodo funcional hasta otro
export function trayecto(S, from, to) {
  if (!S.FN[from] || !S.FN[to]) return null; if (from === to) return [];
  const prev = {[from]: null}, q = [from];
  while (q.length) { const x = q.shift(); for (const st of S.ADJ[x] || []) if (!(st.to in prev)) { prev[st.to] = {x, st}; if (st.to === to) { const path = []; let y = to; while (prev[y]) { path.unshift({de: prev[y].x, a: y, ...prev[y].st}); y = prev[y].x; } return path; } q.push(st.to); } }
  return null;
}
// Molde de trayecto hacia un polo (lectura nuestra): columna fija de nodos + acceso desde el ancla más cercana.
// Devuelve {f, entry, access (pasos de f a entry), col (pasos de la columna, en su orden)}.
export function molde(S, froms, p) {
  const P = S.ftree.plantilla?.[p]; if (!P) return null;
  const C = P.columna, set = new Set(C);
  let best = null;
  for (const f of froms) {
    if (!S.FN[f]) continue;
    if (set.has(f)) { best = {f, entry: f, access: []}; break; }
    const prev = {[f]: null}, q = [f]; let hit = null;
    while (q.length && !hit) { const x = q.shift(); for (const st of S.ADJ[x] || []) if (!(st.to in prev)) { prev[st.to] = {x, st}; if (set.has(st.to)) { hit = st.to; break; } q.push(st.to); } }
    if (!hit) continue;
    const access = []; let y = hit; while (prev[y]) { access.unshift({de: prev[y].x, a: y, ...prev[y].st}); y = prev[y].x; }
    if (!best || access.length < best.access.length) best = {f, entry: hit, access};
  }
  return best && {...best, label: P.label, columna: C, col: colSteps(S, C)};
}
export function colSteps(S, C) {
  return C.slice(1).map((y, i) => { const x = C[i];
    const e = S.FE.find(z => z.de === x && z.a === y), r = !e && S.FE.find(z => z.de === y && z.a === x);
    return e ? {de: x, a: y, e, dir: 1} : r ? {de: x, a: y, e: r, dir: -1} : {de: x, a: y, falta: true}; });
}
// invierte una lista de pasos (para leer desde el polo hacia el concepto)
export const revSteps = steps => steps.slice().reverse().map(st => ({...st, de: st.a, a: st.de, dir: -st.dir}));
// ---- consultas ----
export function desc(S, id) { const out = new Set([id]); const r = i => (S.N[i]?.hijos || []).forEach(h => { out.add(h); r(h); }); r(id); return out; }
export function fdesc(S, id) { const out = new Set([id]); const r = i => (S.FN[i]?.hijos || []).forEach(h => { out.add(h); r(h); }); r(id); return out; }
// filtro: c = concepto del estático (con sus especies) · f = nodo funcional (lo que se ancla en él)
export const parHas = (S, n, flt) => {
  const t = S.TP[n]; if (!t || !flt) return false;
  if (flt.c) { const ds = desc(S, flt.c); return t.conceptos.some(k => ds.has(k.c)); }
  return t.conceptos.some(k => anchorsOf(S, k.c, k.s).some(a => a.f === flt.f));
};
export const parStatus = (S, n) => S.TP[n] ? S.TP[n].estado : 'none';
// Alcance observado, no certificación de que cada párrafo esté revisado.
export const ultimoCapituloTagueado = S => S.pars.reduce((ultimo,p) =>
  ['confirmado','propuesto','discusion'].includes(parStatus(S,p.nro)) ? Math.max(ultimo,p.cap || 0) : ultimo,0);
export const subsOf = (S, n) => Object.values(S.SUB).filter(s => s.pars.includes(n));
export const unitsOf = (S, n) => S.tags.unidades.filter(u => u.parrafos.includes(n));
export function bkLabel(S, n) {
  const ss = subsOf(S, n).filter(s => s.pars[0] === n && s.pars.at(-1) === n);
  return ss.length ? `${ss[0].bekker[0]}–${ss.at(-1).bekker[1]}` : `desde ~${S.P[n].bk_ini}`;
}
export function cntOf(S, id) { const ds = desc(S, id); return S.tags.parrafos.filter(p => p.conceptos.some(k => ds.has(k.c))).length; }
export const fcntOf = (S, id) => (S.fusage[id] || []).length;
// Entradas de los grafos (nodos y aristas) que citan un tramo Bekker de la EN
// Las que coinciden solo por su referencia de cotejo (ref_cf) llevan cf: true y el ancho de esa coincidencia.
export function refsEnTramo(S, a, b) {
  if (!S.refs) return [];
  const hit = rs => rs.filter(([s, e]) => s <= b && e >= a);
  return S.refs.map(x => { const p = hit(x.en), c = hit(x.encf || []);
    if (!p.length && !c.length) return null;
    return {...x, cf: !p.length, ancho: Math.min(...(p.length ? p : c).map(([s, e]) => e - s))}; }).filter(Boolean);
}

// Referencia «mapa» (D21): «unidad:id», «sub:id» o «super:id». Devuelve {kind, id, obj} o null si no existe.
export function mapaRef(S, a) {
  const i = String(a || '').indexOf(':'); if (i < 0) return null;
  const kind = a.slice(0, i), id = a.slice(i + 1);
  const obj = kind === 'unidad' ? S.U[id] : kind === 'sub' ? S.SUB[id] : kind === 'super' ? S.SUPER[id] : null;
  return obj ? {kind, id, obj} : null;
}
// Todas las referencias «mapa» del tagueo, con su origen (sub-unidad o nota de párrafo)
export function mapaRefs(S) {
  const out = [];
  Object.values(S.SUB).forEach(s => (s.mapa || []).forEach(m => out.push({...m, desde: {sub: s.id}})));
  S.tags.parrafos.forEach(p => (p.notas || []).forEach((n, k) => (n.mapa || []).forEach(m => out.push({...m, desde: {parrafo: p.parrafo, nota: k, bekker: n.bekker}}))));
  return out;
}
