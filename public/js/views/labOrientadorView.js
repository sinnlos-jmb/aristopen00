import { esc } from '../ui.js';
import { iniciarOrientacion, siguientePregunta, responderOrientacion, cerrarOrientacion, resumenOrientacion } from '../lab/orientador.js';
import { downloadJSON, copyJSON } from '../lab/session.js';

const EJEMPLO = 'Quiero comprender la naturaleza y su relación con la felicidad';
const etiquetas = {
  tema: 'Tema', intencion: 'Propósito', destino: 'Relación buscada',
  nivel: 'Punto de partida del estudiante', extension: 'Extensión', origen: 'Origen preferido',
};

// Experimento aislado: no usa el bot del Chat ni guarda cambios editoriales.
export function createLabOrientadorView(App = null) {
  const el = document.createElement('div');
  el.className = 'view-lab scrollable has-scroll';
  let sesion = null;
  const S = App?.S || null;

  function render() {
    const actual = sesion ? siguientePregunta(sesion, S) : null;
    const resumen = sesion ? resumenOrientacion(sesion) : null;
    el.innerHTML = `<div class="lab__inner">
      <nav class="lab-nav"><a class="btn btn--ghost btn--sm" href="#/lab">← Laboratorio</a></nav>
      <header class="lab-exp__header"><h1 class="lab-exp__title">Orientador de consultas · V1</h1></header>
      <section class="lab-card" id="lab-orientador">
        <h2>Dar forma a una inquietud</h2>
        <p class="hint">Un pequeño diálogo para precisar qué buscamos. La V1 registra decisiones, pero todavía no construye ni puntúa trayectos. Las preferencias no expresadas permanecen abiertas.</p>
        ${!sesion ? `<form id="orientador-inicio" class="lab-form">
          <label for="orientador-texto">¿Qué te gustaría comprender?</label>
          <input class="lab-input" id="orientador-texto" name="texto" type="text" required maxlength="400" placeholder="${esc(EJEMPLO)}" />
          <button class="lab-btn" type="submit">Comenzar orientación</button>
        </form>` : `
        <p><strong>Inquietud inicial:</strong> ${esc(sesion.textoInicial)}</p>
        <section class="lab-panel" id="orientador-reconocimiento">
          <h3>Reconocimiento inicial · hipótesis del motor</h3>
          <p>${sesion.analisis.activadores?.length
            ? sesion.analisis.activadores.map(c => `<span class="lab-chip">${esc(c.palabra)} <small>→ ${esc(c.id)}</small></span>`).join(' ')
            : '<span class="hint">No se reconocieron conceptos con el léxico actual.</span>'}</p>
          <p class="hint">${sesion.analisis.conceptosDetectados.length > 1 ? 'Se reconocieron varios conceptos: elegí cuál será el tema principal. Los restantes conservarán prioridad al preguntar por relaciones.' : 'El reconocimiento es léxico, no una interpretación filosófica confirmada.'}</p>
          <p class="hint">Intención detectada: ${esc(sesion.analisis.intencionDetectada || 'No determinada; el orientador pedirá precisarla.')}</p>
        </section>
        <p><strong>Estado:</strong> ${esc(sesion.estado)} · ${sesion.bitacora.length} decisiones registradas.</p>
        ${actual ? `<div class="lab-panel" aria-live="polite">
          <h3>${esc(actual.texto)}</h3>
          <p class="hint">Aclaración ${esc(actual.clave)}. Ninguna respuesta altera el grafo ni el Chat.</p>
          <div class="lab-help" id="orientador-opciones">${actual.opciones.map(o => `<button class="lab-help__item" type="button" data-opcion="${esc(o.valor)}">${esc(o.etiqueta)}${o.fuente === 'pregunta_inicial' ? `<small> · Mencionado en tu pregunta${o.vinculo ? ` · Arista ${esc(o.vinculo.direccion)}: ${esc(o.vinculo.de)} → ${esc(o.vinculo.a)} (${esc(o.vinculo.relacion || 'sin tipo')})` : ''}</small>` : o.fuente === 'arista_funcional' ? `<small> · Arista ${esc(o.direccion)}: ${esc(o.de)} → ${esc(o.a)} (${esc(o.relacion || 'sin tipo')})${o.ref ? ` · ref. ${esc(o.ref)}` : ''}</small>` : ''}</button>`).join('')}</div>
        </div>` : sesion.estado === 'en_refinamiento' ? '<p class="lab-panel">La consulta está especificada. Podés confirmarla o abandonar el proceso.</p>' : '<p class="lab-panel">La orientación terminó. La bitácora sigue disponible para su examen.</p>'}
        <div class="lab-toolbar">
          ${sesion.estado === 'en_refinamiento' ? `<button type="button" class="lab-btn" id="orientador-conforme">Conforme con la consulta</button>
          <button type="button" class="lab-btn lab-btn--ghost" id="orientador-abandonar">Abandonar</button>` : ''}
          <button type="button" class="lab-btn lab-btn--ghost" id="orientador-reiniciar">Nueva consulta</button>
          <button type="button" class="lab-btn lab-btn--ghost" id="orientador-exportar">Exportar bitácora JSON</button>
          <button type="button" class="lab-btn lab-btn--ghost" id="orientador-copiar">Copiar JSON</button>
        </div>
        <p class="hint" id="orientador-estado" role="status"></p>
        <div class="lab-panel"><h3>Consulta estructurada</h3>
        <dl class="lab-facts">${Object.entries(sesion.consulta).map(([k,v]) => `<dt>${esc(etiquetas[k] || k)}</dt><dd>${esc(v === null ? 'No precisado' : v)}</dd>`).join('')}</dl>
        <p class="hint">Candidatos: ${resumen.candidatos}. Aún no se asigna ranking ni validación hermenéutica.</p></div>
        <div class="lab-panel"><h3>Génesis de las decisiones</h3>
          <ol id="orientador-bitacora">${sesion.bitacora.map(p => `<li><strong>${esc(p.numero)}. ${esc(p.tipo)}</strong> · ${esc(p.datos.formulacion || p.datos.texto || p.datos.motivo || '')} ${p.datos.opcion ? `→ ${esc(p.datos.opcion.etiqueta)}` : ''}</li>`).join('')}</ol>
          <details><summary>JSON completo de la sesión</summary><pre class="lab-json" id="orientador-json">${esc(JSON.stringify(sesion, null, 2))}</pre></details>
        </div>`}
      </section></div>`;
    bind();
  }

  function bind() {
    const form = el.querySelector('#orientador-inicio');
    form?.addEventListener('submit', event => {
      event.preventDefault();
      const texto = form.querySelector('#orientador-texto').value.trim();
      if (!texto) return;
      sesion = iniciarOrientacion(texto);
      render();
    });
    el.querySelectorAll('[data-opcion]').forEach(button => button.addEventListener('click', () => {
      sesion = responderOrientacion(sesion, button.dataset.opcion, S);
      render();
    }));
    el.querySelector('#orientador-conforme')?.addEventListener('click', () => { sesion = cerrarOrientacion(sesion, 'conforme'); render(); });
    el.querySelector('#orientador-abandonar')?.addEventListener('click', () => { sesion = cerrarOrientacion(sesion, 'abandonado'); render(); });
    el.querySelector('#orientador-reiniciar')?.addEventListener('click', () => { sesion = null; render(); });
    el.querySelector('#orientador-exportar')?.addEventListener('click', () => downloadJSON(sesion, 'agora-orientador-v1.json'));
    el.querySelector('#orientador-copiar')?.addEventListener('click', async () => {
      const status = el.querySelector('#orientador-estado');
      try { await copyJSON(sesion); status.textContent = 'Bitácora copiada.'; }
      catch (error) { status.textContent = 'No se pudo copiar: ' + error.message; }
    });
  }
  render();
  return { el, destroy() { sesion = null; } };
}
