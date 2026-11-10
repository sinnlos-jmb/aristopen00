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
      const message = document.createElement('div');
      message.className = 'empty';
      message.textContent = `Error cargando la vista: ${e?.message || String(e)}.`;
      document.getElementById('app').replaceChildren(message);
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
