export function createRouter({ routes, notFound, onChange }) {
  let current = null;
  let revision = 0;
  const parse = () => {
    const h = location.hash.replace(/^#/, '') || '/';
    return h.startsWith('/') ? h : '/' + h;
  };
  const resolve = async () => {
    const request = ++revision;
    const path = parse();
    const factory = routes[path] || notFound;
    if (current?.destroy) { try { current.destroy(); } catch (e) { console.warn(e); } }
    current = null;
    let view;
    try {
      view = await factory();
    } catch (e) {
      console.error('Router: factory failed:', e);
      document.getElementById('app').innerHTML = `<div class="empty">Error cargando la vista: ${e.message || e}.</div>`;
      return;
    }
    if (request !== revision) { view.destroy?.(); return; }
    document.getElementById('app').replaceChildren(view.el);
    current = view;
    onChange?.(path);
  };
  window.addEventListener('hashchange', resolve);
  return { start: resolve, reload: resolve, path: parse };
}
