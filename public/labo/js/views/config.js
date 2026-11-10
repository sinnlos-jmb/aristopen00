import { esc, toast } from '../ui.js';

export async function render(root, app) {
  root.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Preferencias locales</div>
        <h1>Configuración</h1>
        <p>Configurá el alcance y la política experimental del selector conceptual F1.2.</p>
      </div>
    </div>
    <div class="settings-grid">
      <form class="settings-card" id="settings-form">
        <h2>Búsqueda predeterminada</h2>
        <p>Estas preferencias se guardan en este navegador.</p>
        <div class="field">
          <label for="default-scope">Alcance</label>
          <select id="default-scope" name="scope">
            <option value="en1"${app.config.scope === 'en1' ? ' selected' : ''}>EN libro I</option>
            <option value="all"${app.config.scope === 'all' ? ' selected' : ''}>Todo el material disponible</option>
          </select>
          <small>“EN libro I” incluye los fragmentos vinculados con el libro I, aunque una ficha cite también otras obras.</small>
        </div>
        <div class="field">
          <label for="result-limit">Cantidad máxima de resultados</label>
          <input id="result-limit" name="limit" type="number" min="5" max="50" step="5" value="${esc(app.config.limit)}">
        </div>
        <label class="checkline">
          <input name="includeUnstructured" type="checkbox"${app.config.includeUnstructured ? ' checked' : ''}>
          <span>
            Admitir voces no estructuradas en el dossier
            <small>La búsqueda siempre puede encontrarlas. Esta opción permite seleccionarlas como evidencia y habilita las aristas de grafos todavía no revisadas.</small>
          </span>
        </label>
        <button class="primary" type="submit">Guardar configuración</button>
      </form>
      <aside class="notice">
        <h2>Política de voces</h2>
        <p>El corpus contiene ${app.corpus.stats.structured.toLocaleString('es-AR')} fragmentos con voz estructurada y ${app.corpus.stats.unstructured.toLocaleString('es-AR')} todavía no estructurados.</p>
        <ul>
          <li>El original griego, la traducción y las notas conservan voces separadas.</li>
          <li>Las introducciones pedagógicas se identifican como lectura nuestra.</li>
          <li>Las fichas de nodos de grafos quedan fuera del dossier por defecto.</li>
          <li>Las 64 aristas de grafos ya tagueadas sí conservan su voz.</li>
          <li>Se pueden combinar hasta tres categorías, sentidos, anclas o aristas.</li>
          <li>Los descendientes se incluyen con un peso menor que la coincidencia directa.</li>
          <li>Una búsqueda nueva muestra solo párrafos; las demás fuentes se agregan desde Búsqueda.</li>
        </ul>
      </aside>
    </div>
  `;
  root.querySelector('#settings-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    app.config = app.setConfig({
      scope: form.get('scope'),
      limit: form.get('limit'),
      includeUnstructured: form.get('includeUnstructured') === 'on',
    });
    toast('Configuración guardada.');
  });
}
