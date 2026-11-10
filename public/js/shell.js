// shell.js — comportamiento del marco de la app (sidebar, tema, breadcrumbs,
// scroll dinámico). Portado de la maqueta, SIN su showView ni su handler global
// de <a href="#...">: la navegación la hace router.js.

const COLLAPSE_KEY = 'aristoteles.sidebar.collapsed';
const THEME_KEY = 'aristoteles.theme';
const MOBILE_MQ = '(max-width: 768px)';
const SCROLL_THRESHOLD = 30;

const NAV_LABELS = {
  home: 'Portada', chat: 'Diálogo', reading: 'Lectura',
  grafos: 'Grafos', lab: 'Laboratorio',
};

const safeGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
const isMobile = () => window.matchMedia(MOBILE_MQ).matches;

export function initShell() {
  const html = document.documentElement;
  const sidebar = document.getElementById('sidebar');
  const brand = document.getElementById('sidebarBrand');
  const toggle = document.getElementById('sidebarToggle');
  const themeToggle = document.getElementById('themeToggle');
  const breadcrumbs = document.getElementById('breadcrumbs');
  const navItems = [...document.querySelectorAll('.sidebar__nav .nav-item')];

  // — Sidebar ----------------------------------------------------------------
  let collapsed = false;
  function setSidebarCollapsed(value) {
    collapsed = value;
    sidebar.classList.toggle('collapsed', value);
    brand?.setAttribute('aria-expanded', String(!value));
    html.style.setProperty('--sidebar-current-w', value ? '72px' : '260px');
    safeSet(COLLAPSE_KEY, String(value));
  }
  const openDrawer = () => {
    sidebar.classList.add('open');
    toggle?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const closeDrawer = () => {
    sidebar.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  const toggleSidebar = () => {
    if (isMobile()) sidebar.classList.contains('open') ? closeDrawer() : openDrawer();
    else setSidebarCollapsed(!collapsed);
  };

  if (safeGet(COLLAPSE_KEY) === 'true') setSidebarCollapsed(true);
  brand?.addEventListener('click', () => { if (!isMobile()) setSidebarCollapsed(!collapsed); });
  brand?.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isMobile()) { e.preventDefault(); setSidebarCollapsed(!collapsed); }
  });
  toggle?.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(); });
  document.addEventListener('click', (e) => {
    if (isMobile() && sidebar.classList.contains('open')
        && !sidebar.contains(e.target) && !toggle?.contains(e.target)) closeDrawer();
  });
  // Al navegar en móvil, cerrar el cajón.
  window.addEventListener('hashchange', () => { if (isMobile()) closeDrawer(); });

  // — Tema --------------------------------------------------------------------
  const systemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const currentTheme = () => html.getAttribute('data-theme') || systemTheme();
  function applyTheme(theme, persist = true) {
    html.setAttribute('data-theme', theme);
    const dark = theme === 'dark';
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
      themeToggle.title = 'Tema actual: ' + (dark ? 'oscuro' : 'claro');
    }
    if (persist) safeSet(THEME_KEY, theme);
  }
  const toggleTheme = () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');

  applyTheme(safeGet(THEME_KEY) || systemTheme(), false);
  themeToggle?.addEventListener('click', toggleTheme);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!safeGet(THEME_KEY)) applyTheme(e.matches ? 'dark' : 'light', false);
  });

  // — Atajos: Ctrl/Cmd+B sidebar, Ctrl/Cmd+Shift+D tema ------------------------
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleSidebar(); }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); toggleTheme(); }
  });

  // — Navegación activa y breadcrumbs ------------------------------------------
  function setActiveNav(key) {
    for (const a of navItems) {
      const on = a.dataset.nav === key;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    if (!breadcrumbs) return;
    const label = NAV_LABELS[key] || navItems.find(a => a.dataset.nav === key)?.querySelector('.nav-item__label')?.textContent;
    breadcrumbs.innerHTML = key === 'home' || !label
      ? `<span class="breadcrumb current">${NAV_LABELS.home}</span>`
      : `<a href="#/" class="breadcrumb">${NAV_LABELS.home}</a><span class="breadcrumb-separator" aria-hidden="true">/</span><span class="breadcrumb current">${label}</span>`;
  }

  // — Scroll dinámico: .scrollable pasa a overflow:auto si desborda >= 30px ------
  const updateScrollables = () => {
    document.querySelectorAll('.scrollable').forEach(el => {
      el.classList.toggle('has-scroll', el.scrollHeight - el.clientHeight >= SCROLL_THRESHOLD);
    });
  };
  const ro = new ResizeObserver(() => requestAnimationFrame(updateScrollables));
  // Las vistas se montan dinámicamente: volver a observar tras cada cambio de ruta.
  function refreshScrollables() {
    ro.disconnect();
    document.querySelectorAll('.scrollable').forEach(el => {
      ro.observe(el);
      [...el.children].forEach(c => ro.observe(c));
    });
    updateScrollables();
  }

  html.classList.add('js-enabled');
  return { setActiveNav, refreshScrollables, setSidebarCollapsed, applyTheme, toggleTheme };
}
