// Parser del texto de referencia (.txt v8) y utilidades Bekker. Sin DOM: se usa también desde Node.
const GR = /[\u0370-\u03FF\u1F00-\u1FFF]/;
const LET = /\p{L}/u;
function isGreek(line) {
  const ls = [...line].filter(c => LET.test(c));
  return ls.length > 0 && ls.filter(c => GR.test(c)).length / ls.length > 0.6;
}
// «1097b22» → número ordenable (página·100 + columna·50 + línea)
export function bkNum(s) {
  const m = /^(\d{4})([ab])(\d{1,2})?$/.exec(String(s).trim());
  return m ? +m[1] * 100 + (m[2] === 'b' ? 50 : 0) + (m[3] ? +m[3] : 0) : null;
}
export function parseTexto(txt) {
  const lines = txt.replace(/\r/g, '').split('\n');
  const pars = []; let cap = null, cur = null;
  lines.forEach((l, i) => {
    const s = l.trim();
    if (/^\d{1,2}$/.test(s) && (lines[i + 1] || '').trim().startsWith('──')) { cap = +s; return; }
    if (s.startsWith('{') && s.includes('"parrafo_nro"')) {
      const h = JSON.parse(s);
      cur = {nro: h.parrafo_nro, cap, tags: h.tags || [], es: [], gr: []}; pars.push(cur); return;
    }
    if (!cur || !s || s.startsWith('──') || s.startsWith('══')) return;
    (isGreek(s) ? cur.gr : cur.es).push(s);
  });
  // Bekker aproximado del comienzo de cada párrafo (última marca de página o línea vista)
  let page = null, line = null;
  pars.forEach(p => {
    p.es = p.es.join('\n'); p.gr = p.gr.join('\n');
    p.bk_ini = page ? `${page}${line || ''}` : '1094a1'; p.bk_ini_n = bkNum(p.bk_ini);
    for (const m of p.gr.matchAll(/(1\d{3}[ab])|\[(\d{1,2})\]/g)) { if (m[1]) { page = m[1]; line = 1; } else line = +m[2]; }
  });
  pars.forEach((p, i) => { p.bk_fin_n = pars[i + 1] ? pars[i + 1].bk_ini_n : bkNum(`${page}${line}`) + 10; });
  return pars;
}
