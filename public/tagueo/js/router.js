// Router por hash: #/seccion/arg1/arg2?clave=valor
export function parse(h = location.hash) {
  const raw = h.replace(/^#\/?/, ''), q = raw.indexOf('?');
  const path = q < 0 ? raw : raw.slice(0, q), qs = q < 0 ? '' : raw.slice(q + 1);
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return {sec: parts[0] || '', args: parts.slice(1), query: Object.fromEntries(new URLSearchParams(qs))};
}
export function href(sec, args = [], query = {}) {
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== '')).toString();
  return '#/' + [sec, ...[].concat(args)].filter(x => x != null && x !== '').map(encodeURIComponent).join('/') + (qs ? '?' + qs : '');
}
export function createRouter({views, fallback, mount}) {
  let last = null;
  const run = () => {
    const r = parse();
    if (!views[r.sec]) { location.replace(fallback); return; }
    const same = last && last.sec === r.sec;
    last = r; mount(views[r.sec], r, same);
  };
  window.addEventListener('hashchange', run);
  return {start: run, rerender: () => last && mount(views[last.sec], last, true), current: () => last};
}
