// Catálogo de acceso: no incorpora afirmaciones de intérpretes al grafo textual.
import { renderCatalogHeader, renderCatalogCard } from './shared.js';
const base = '/grafos/textos/';
const graph = (file, title, desc) => ({ href: base + file, title, desc, tag: 'Mapa de lectura · provisional', icon: '🕸️', action: 'Abrir grafo' });
const reader = (id, from, title) => ({ href: base + 'lectura.html?t=' + id + '&from=' + from, title, desc: 'Texto de referencia numerado por párrafos; consultá las remisiones del mapa.', tag: 'Texto del intérprete', icon: '📖', action: 'Leer texto' });
export const BIBLIOGRAPHY_GROUPS = [
  { title: 'Enrico Berti · Il bene', items: [
    graph('grafo-berti-1.html','El bien · mapa general','Reconstrucción editorial del problema del bien y su historia.'),
    graph('grafo-berti-2.html','Propuestas superadoras','Berti y nuestra lectura: distinguir sus respectivas voces.'),
    graph('berti-bien.html','La cadena de realización del bien','Autores, capas y rupturas de la cuestión del bien.'),
    reader('berti-il-bene','grafo-berti-1.html','Il bene · texto')
  ] },
  { title: 'Joseph Owens · Forma y actividad', items: [
    { href: base + 'owens.html', title: 'Owens · hilo conductor', desc: 'Entrada a los cinco estudios y a sus conexiones con la lectura propia.', tag: 'Presentación editorial', icon: '🧭', action: 'Abrir entrada' },
    graph('grafo-owens-1.html','La teleología de la naturaleza','Teleology of Nature in Aristotle.'),
    graph('grafo-owens-2.html','Aristóteles sobre Empédocles','Aristotle on Empedocles.'),
    graph('grafo-owens-3.html','El conocimiento, un modo de ser','Cognition a Way of Being.'),
    graph('grafo-owens-4.html','La noción de sabiduría','Aristotle’s Notion of Wisdom.'),
    graph('grafo-owens-5.html','La definición del alma','Aristotle’s Definition of Soul.')
  ] }
];
export function createLabBibliographyView() {
  const el = document.createElement('div');
  el.className = 'scrollable has-scroll catalog-view';
  el.innerHTML = `<div class="catalog-view__content">
    <nav class="lab-nav" aria-label="Navegación"><a href="#/lab" class="btn btn--ghost btn--sm">← Laboratorio</a></nav>
    ${renderCatalogHeader({ eyebrow: 'Bibliografía secundaria', title: 'Lecturas e interpretaciones', description: 'Mapas provisionales de investigación. Las tesis de los intérpretes y las propuestas propias no equivalen a afirmaciones textuales de Aristóteles. Los grafos se abren en sus visores originales; para volver, usá Atrás del navegador.' })}
    ${BIBLIOGRAPHY_GROUPS.map(group => `<section class="section catalog-section"><h2>${group.title}</h2><div class="card-grid card-grid--catalog" role="list">${group.items.map(renderCatalogCard).join('')}</div></section>`).join('')}
    </div>`;
  return { el };
}
