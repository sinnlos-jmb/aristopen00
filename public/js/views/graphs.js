// public/js/views/graphs.js
import { renderCatalogHeader, renderCatalogCard, renderSiteFooter } from './shared.js';

// Los archivos originales permanecen accesibles directamente; dentro de Ágora
// se alojan en la misma vista, manteniendo la cabecera y el estado de la app.
export const GRAPHS = Object.freeze({
  // 1. Mapas generales
  cero: { file: 'grafo_cero.html', title: 'El sustrato', desc: 'El recorrido común: naturaleza, acción, virtud y lo divino.', tag: 'Base conceptual', icon: '🌱', category: 'general' },
  intro: { file: 'grafo_intro.html', title: 'Filosofía práctica', desc: 'El bien, la acción y la investigación práctica.', tag: 'Introducción', icon: '🧭', category: 'general' },
  bien: { file: 'grafo_bien.html', title: 'El bien como fin', desc: 'La estructura de fines y la pregunta por el bien.', tag: 'EN I.1–6', icon: '🎯', category: 'general' },
  bienes: { file: 'grafo_bienes.html', title: 'Tipos de bienes', desc: 'Las clases de bienes y sus relaciones.', tag: 'Clasificación', icon: '⚖', category: 'general' },
  felicidad: { file: 'grafo_felicidad.html', title: 'Condiciones de la felicidad', desc: 'La felicidad, su actividad y las condiciones de una vida completa.', tag: 'Eudaimonía', icon: '✨', category: 'general' },
  
  // 2. Argumento del érgon
  ergon: { file: 'grafo_ergon.html', title: 'El argumento del érgon', desc: 'Recorrido general del argumento y acceso a sus subgrafos.', tag: 'Mapa principal · EN I.7–8', icon: '⚙', featured: true, category: 'ergon' },
  forma: { file: 'grafo_ergon_forma.html', title: 'La forma del fin', desc: 'Completitud y autosuficiencia.', tag: 'Subgrafo · 1097a15–b21', icon: '📐', category: 'ergon' },
  funcion: { file: 'grafo_ergon_obra.html', title: 'La función propia', desc: 'De la criba a la definición.', tag: 'Subgrafo · 1097b22–1098a20', icon: '🛠', category: 'ergon' },
  esbozo: { file: 'grafo_ergon_esbozo.html', title: 'Esbozo y método', desc: 'Rigor, materia y principios.', tag: 'Subgrafo · 1098a20–b8', icon: '📏', category: 'ergon' },
  confirmacion: { file: 'grafo_confirmacion.html', title: 'La confirmación', desc: 'Opiniones, virtud en acto, placer y bienes exteriores.', tag: 'Subgrafo · EN I.8', icon: '✅', category: 'ergon' },
  
  // 3. Temas relacionados
  esferas: { file: 'grafo_esferas.html', title: 'Las tres esferas', desc: 'Producción, acción y contemplación.', tag: 'Formas de actividad', icon: '🌐', category: 'temas' },
  alma: { file: 'grafo_alma.html', title: 'El alma', desc: 'Partes, facultades y virtudes.', tag: 'EN I.13 · VI', icon: '🧠', category: 'temas' },
});

export function createGraphCatalogView() {
  const el = document.createElement('div');
  el.className = 'scrollable has-scroll catalog-view';

  const renderCard = (id, graph) => renderCatalogCard({
    href: `#/grafos/${id}`, ...graph, action: 'Abrir mapa',
  });

  // Agrupamos los grafos por categoría
  const general = Object.entries(GRAPHS).filter(([, g]) => g.category === 'general');
  const ergon = Object.entries(GRAPHS).filter(([, g]) => g.category === 'ergon');
  const temas = Object.entries(GRAPHS).filter(([, g]) => g.category === 'temas');

  el.innerHTML = `
    <div class="catalog-view__content">
      ${renderCatalogHeader({
        eyebrow: 'Cartografía conceptual',
        title: 'Mapas de lectura',
        description: 'Grafos interactivos sobre temas y argumentos de la Ética nicomáquea. Cada mapa permite seleccionar conceptos, relaciones y referencias para profundizar en el texto.',
      })}
      <section class="section catalog-section">
        <header class="section__header"><h2 class="section__title">Mapas generales</h2></header>
        <div class="card-grid card-grid--catalog" role="list">${general.map(([id, g]) => renderCard(id, g)).join('')}</div>
      </section>
      <section class="section catalog-section">
        <header class="section__header"><h2 class="section__title">Argumento del érgon</h2></header>
        <div class="card-grid card-grid--catalog" role="list">${ergon.map(([id, g]) => renderCard(id, g)).join('')}</div>
      </section>
      <section class="section catalog-section catalog-section--last">
        <header class="section__header"><h2 class="section__title">Temas relacionados</h2></header>
        <div class="card-grid card-grid--catalog" role="list">${temas.map(([id, g]) => renderCard(id, g)).join('')}</div>
      </section>
    </div>
    ${renderSiteFooter()}
  `;

  return { el };
}

export function createGraphView(id) {
  const graph = GRAPHS[id];
  const el = document.createElement('section');
  el.className = 'view-graph';
  // El grafo necesita ocupar toda la altura del panel principal.
  const mainContenedor = document.querySelector('main');
  mainContenedor?.classList.add('main--graph');

  // Los breadcrumbs son dibujados por el shell al terminar la navegación.
  // El siguiente frame los actualiza sin depender de un tiempo arbitrario.
  let divider = null;
  let titleText = null;
  const frameId = requestAnimationFrame(() => {
    const breadcrumbs = document.getElementById('breadcrumbs');
    if (breadcrumbs) {
      divider = document.createElement('div');
      divider.className = 'header__divider';
      
      titleText = document.createElement('span');
      titleText.className = 'breadcrumb current';
      titleText.classList.add('graph-breadcrumb__title');
      titleText.textContent = graph.title;
      
      breadcrumbs.appendChild(divider);
      breadcrumbs.appendChild(titleText);
    }
  });

  // 3. Crear el iframe
  const frame = document.createElement('iframe');
  frame.className = 'view-graph__frame';
  frame.title = `Grafo interactivo: ${graph.title}`;
  frame.src = `/grafos/${graph.file}`;
  
  // 4. Actualizar título si navegás a un subgrafo
  frame.addEventListener('load', () => {
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const subTitle = doc.querySelector('header h1')?.textContent?.trim();
      if (subTitle && titleText) {
        titleText.textContent = subTitle;
        frame.title = `Grafo interactivo: ${subTitle}`;
      }
    } catch (_) { /* Ignorar bloqueos de origen */ }
  });

  
  el.append(frame);
  
  return {
    el,
    destroy() {
      cancelAnimationFrame(frameId);
      mainContenedor?.classList.remove('main--graph');
      
      // Limpiar los breadcrumbs dinámicos
      if (titleText && titleText.parentNode) titleText.remove();
      if (divider && divider.parentNode) divider.remove();
      
      frame.removeAttribute('src');
      frame.remove();
    },
  };
}