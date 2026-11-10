import { esc } from '../ui.js';

export function render(root, { title, step, text }) {
  root.innerHTML = `<section class="placeholder">
    <span class="step">${esc(step)}</span>
    <h1>${esc(title)}</h1>
    <p>${esc(text)}</p>
    <a class="button" href="#/buscar">Volver a Búsqueda</a>
  </section>`;
}
