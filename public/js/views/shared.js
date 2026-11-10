// Marcado compartido entre vistas. No contiene estado ni eventos.
import { esc } from '../ui.js';

export function renderCatalogHeader({ eyebrow, title, description }) {
  return `<header class="lab__head catalog-view__head">
    <span class="lab__eyebrow">${esc(eyebrow)}</span>
    <h1 class="catalog-view__title">${esc(title)}</h1>
    <p class="catalog-view__description">${esc(description)}</p>
  </header>`;
}

export function renderCatalogCard({ href, featured, icon, tag, title, desc, action }) {
  return `<a href="${esc(href)}" role="listitem" class="card card--catalog-link ${featured ? 'card--proyecto' : 'card--concepto'}">
    <div class="card__media"><div class="card__icon" aria-hidden="true">${esc(icon)}</div></div>
    <div class="card__body">
      <p class="card__eyebrow">${esc(tag)}</p>
      <h3 class="card__title">${esc(title)}</h3>
      <p class="card__text">${esc(desc)}</p>
    </div>
    <div class="card__footer"><span class="card__meta">${esc(action)} <strong>→</strong></span></div>
  </a>`;
}

export function renderSiteFooter() {
  return `<footer class="footer view-footer" role="contentinfo">
    <div class="footer__inner">
      <p class="footer__copyright">© 2026 Ágora — Interpretación digital de la Ética Nicomaquea. Código abierto bajo licencia MIT.</p>
      <nav class="footer__links" aria-label="Enlaces legales">
        <a href="#/licencia" class="footer__link">Licencia</a>
        <a href="#/privacidad" class="footer__link">Privacidad</a>
        <a href="#/creditos" class="footer__link">Créditos</a>
        <a href="https://github.com" target="_blank" rel="noopener" class="footer__link">GitHub</a>
      </nav>
    </div>
  </footer>`;
}
