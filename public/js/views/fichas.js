// N1-U.13 · Puerta de entrada pública a las fichas del Libro I.
// El motor editorial permanece en un único lugar (Lab), sin copiar grafo,
// recorridos, vínculos o texto. Las rutas son alias explícitos de fichas.
import { createLabArchitectureView } from './labArchitectureView.js';
import { FICHAS_PUBLICAS } from '../lab/architecturePublicRoutes.js';
import { cargarIndiceFichas, buscarFichasVectorial } from '../lab/architectureSparseSearch.js';

// La lista de rutas y este catálogo se contrastan en la prueba de N1-U.13.
const slugsPorId = new Map(Object.entries(FICHAS_PUBLICAS).map(([slug, id]) => [id, slug]));

export async function createFichasView(App, { fichaId = null } = {}) {
  const vista = await createLabArchitectureView(App);
  const el = vista.el;
  el.classList.add('arch-publica');
  el.setAttribute('aria-label', 'Fichas filosóficas del Libro I');

  // La misma navegación y los mismos comentarios; sólo cambia el marco público.
  const superior = el.querySelector('.arch-top');
  if (superior) {
    const volver = superior.querySelector('a');
    const contexto = superior.querySelector('span');
    if (volver) { volver.href = '#/'; volver.textContent = '← Portada'; }
    if (contexto) contexto.textContent = 'Libro I · Fichas explicativas · Edición piloto';
  }
  const titulo = el.querySelector('.arch-page > h1');
  if (titulo) titulo.textContent = 'Explorá la Ética a través de sus preguntas';
  const intro = el.querySelector('.arch-intro');
  if (intro) intro.textContent = 'Elegí una ficha, seguí su explicación y consultá los pasajes que la sostienen. Los recorridos en revisión se distinguen de las fuentes publicadas.';

  const detalles = document.createElement('details');
  detalles.className = 'arch-remisiones';
  detalles.innerHTML = `<summary>Cómo se organizan las explicaciones</summary>
    <p><strong>Ficha:</strong> explicación reutilizable de un problema filosófico.</p>
    <p><strong>Subficha:</strong> adaptación dependiente de otra ficha, con identidad y procedencia explícitas.</p>
    <p><strong>FAQ:</strong> pregunta que organiza fichas y subfichas en un recorrido. Las propuestas no son trayectos publicados en MariaDB.</p>
    <p><a href="#/lab/arquitectura">Abrir el experimento en el Laboratorio</a></p>`;
  intro?.insertAdjacentElement('afterend', detalles);

  // N1-U.14 · Puente hacia el antiguo Lab de búsqueda: índice local de fichas.
  // La búsqueda orienta al lector, pero no altera grafos ni relaciones editoriales.
  const buscar = document.createElement('details');
  buscar.className = 'agora-fichas-search';
  buscar.innerHTML = `<summary>Buscar una explicación entre las siete fichas</summary>
    <form class="agora-fichas-search-form">
      <label for="agora-buscar-fichas">Pregunta o conceptos</label>
      <input id="agora-buscar-fichas" type="search" maxlength="200" autocomplete="off" placeholder="Ej.: actividad del alma y virtud" required>
      <button type="submit">Buscar fichas</button>
    </form>
    <p class="agora-fichas-search-note">Búsqueda experimental por vectores TF-IDF y similitud coseno: compara palabras de las fichas, no comprende significados ni certifica relaciones filosóficas.
      Para buscar en pasajes y fuentes del corpus: <a href="/labo/#/buscar" data-agora-open-corpus>abrir el Lab anterior</a>.</p>
    <div class="agora-fichas-search-results" role="status" aria-live="polite"></div>`;
  detalles.insertAdjacentElement('afterend', buscar);
  let indiceBusqueda = null;
  let seqBusqueda = 0;
  buscar.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const seq=++seqBusqueda;
    const consulta=buscar.querySelector('input').value;
    buscar.querySelector('[data-agora-open-corpus]').href=`/labo/#/buscar?mode=libre&q=${encodeURIComponent(consulta)}&scope=en1`;
    const area=buscar.querySelector('.agora-fichas-search-results');
    if (el.querySelector('.arch-status--error')) {
      area.textContent='La revisión editorial activa es incompatible; no se muestran resultados de una versión anterior.';
      return;
    }
    area.textContent='Buscando…';
    try {
      if (!indiceBusqueda) indiceBusqueda=await cargarIndiceFichas();
      if (seq!==seqBusqueda) return;
      const resultados=buscarFichasVectorial(indiceBusqueda, consulta);
      area.replaceChildren();
      if (!resultados.length) { area.textContent='No se encontraron coincidencias en estas siete fichas. Probá con otros términos o usá la búsqueda del Lab.';return; }
      const list=document.createElement('ol');
      list.className='agora-fichas-search-list';
      for (const result of resultados) {
        const li=document.createElement('li');
        const button=document.createElement('button');
        button.type='button'; button.textContent=result.title;
        button.addEventListener('click',()=>{
          const ficha=[...el.querySelectorAll('[data-arch-card]')].find(n=>n.dataset.archCard===result.id);
          if(ficha) {ficha.click();buscar.open=false;}
          else area.textContent='No se pudo localizar la ficha en la revisión actual.';
        });
        const detail=document.createElement('small');
        detail.textContent=`Coincidencias: ${result.terms.join(', ')}`;
        li.append(button,detail);list.append(li);
      }
      area.append(list);
    } catch (error) { if(seq===seqBusqueda) area.textContent=`Búsqueda no disponible: ${error.message}`; }
  });

  if (fichaId) {
    // Selecciona por identidad editorial, no por el texto visible del botón.
    const boton = [...el.querySelectorAll('[data-arch-card]')]
      .find(n => n.dataset.archCard === fichaId);
    if (boton) boton.click();
    else {
      const estado = el.querySelector('.arch-status');
      if (estado && !estado.classList.contains('arch-status--error')) {
        estado.textContent = `La ficha solicitada no está disponible en esta revisión editorial: ${fichaId}.`;
      }
    }
  }

  // Las rutas compartibles siguen la selección sin reiniciar Cytoscape ni disparar
  // una nueva navegación; las posiciones, tipografías y preferencias se preservan.
  let destruida = false;
  const actualizarRuta = () => {
    if (destruida || !window.location.hash.startsWith('#/fichas')) return;
    const enRed = el.querySelector('[data-arch-network]')?.getAttribute('aria-pressed') === 'true';
    const activa = [...el.querySelectorAll('[data-arch-card]')]
      .find(n => n.getAttribute('aria-pressed') === 'true')?.dataset.archCard;
    const slug = enRed ? null : slugsPorId.get(activa);
    if (!enRed && !slug) return;
    const nuevaRuta = `#/fichas${slug ? '/' + slug : ''}`;
    if (window.location.hash !== nuevaRuta) {
      window.history.replaceState(window.history.state, '', nuevaRuta);
    }
  };
  const observer = new MutationObserver(actualizarRuta);
  observer.observe(el, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
  actualizarRuta();

  return {
    el,
    destroy() { destruida = true; observer.disconnect(); vista.destroy?.(); },
  };
}
