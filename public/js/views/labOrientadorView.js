import { esc } from '../ui.js';
import { iniciarOrientacion, siguientePregunta, responderOrientacion, cerrarOrientacion, resumenOrientacion, buscarConceptos, responderLibre, precisarSentido, registrarEvaluacionPiloto } from '../lab/orientador.js';
import { downloadJSON, copyJSON } from '../lab/session.js';
import { diagnosticarContinuidad } from '../../shared/orientador-piloto.js';

const EJEMPLO = '¿Cuáles son las diferencias entre disposición, virtud y felicidad?';
const etiquetas = {
  tema: 'Concepto de partida', intencion: 'Propósito', destino: 'Relación buscada',
  conceptosRelacionados: 'Otros conceptos de la pregunta',
  nivel: 'Punto de partida del estudiante', extension: 'Extensión', origen: 'Origen preferido',
};

const preguntasPiloto = [
  { campo: 'claridad', pregunta: '¿Las preguntas de aclaración fueron comprensibles?', opciones: [
    ['si', 'Sí'], ['parcialmente', 'Parcialmente'], ['no', 'No']] },
  { campo: 'fidelidad', pregunta: '¿La consulta final representa lo que querías investigar?', opciones: [
    ['si', 'Sí'], ['en_parte', 'En parte'], ['no', 'No']] },
  { campo: 'influencia', pregunta: '¿Cómo influyeron las sugerencias del bot?', opciones: [
    ['ayudo_a_precisar', 'Me ayudaron a precisar'], ['cambio_direccion', 'Me llevaron a cambiar de dirección'],
    ['no_influyo', 'No influyeron'], ['no_se', 'No estoy seguro/a']] },
];

// El formulario no recopila identidad ni transmite datos al guardar la evaluación.
function formEvaluacion(actual = null) {
  return preguntasPiloto.map(q => `<label for="orientador-piloto-${q.campo}">${esc(q.pregunta)}</label>
    <select id="orientador-piloto-${q.campo}" name="${q.campo}" class="lab-input" required>
      <option value="">Elegí una opción</option>
      ${q.opciones.map(([valor, etiqueta]) => `<option value="${valor}"${actual?.[q.campo] === valor ? ' selected' : ''}>${esc(etiqueta)}</option>`).join('')}
    </select>`).join('');
}

// Experimento aislado: no usa el bot del Chat ni guarda cambios editoriales.
export function createLabOrientadorView(App = null) {
  const el = document.createElement('div');
  el.className = 'view-lab scrollable has-scroll';
  let sesion = null;
  let entradaLibre = false;
  let textoLibre = '';
  let registroEstado = '';
  let registrado = false;
  const S = App?.S || null;

  function render() {
    const actual = sesion ? siguientePregunta(sesion, S) : null;
    const resumen = sesion ? resumenOrientacion(sesion) : null;
    const continuidad = sesion?.consulta.intencion ? diagnosticarContinuidad(sesion) : null;
    el.innerHTML = `<div class="lab__inner">
      <nav class="lab-nav"><a class="btn btn--ghost btn--sm" href="#/lab">← Laboratorio</a></nav>
      <header class="lab-exp__header"><h1 class="lab-exp__title">Orientador de consultas · V2 (piloto)</h1></header>
      <section class="lab-card" id="lab-orientador">
        <h2>Dar forma a una inquietud</h2>
        <p class="hint">Un pequeño diálogo para precisar qué buscamos. La V2 conserva la forma de la pregunta y sus posibles sentidos; todavía no construye ni puntúa trayectos. Las preferencias no expresadas permanecen abiertas.</p>
        ${!sesion ? `<form id="orientador-inicio" class="lab-form">
          <label for="orientador-texto">¿Qué te gustaría comprender?</label>
          <input class="lab-input" id="orientador-texto" name="texto" type="text" required maxlength="400" placeholder="${esc(EJEMPLO)}" />
          <button class="lab-btn" type="submit">Comenzar orientación</button>
        </form>` : `
        <p><strong>Inquietud inicial:</strong> ${esc(sesion.textoInicial)}</p>
        <section class="lab-panel" id="orientador-reconocimiento">
          <h3>Lo que entendí de tu pregunta</h3>
          <p>${sesion.interpretacion?.conceptos.length
            ? `Identifiqué: <strong>${sesion.interpretacion.conceptos.map(id => esc(S?.N?.[id]?.label || S?.FN?.[id]?.label || id)).join(', ')}</strong>. `
            : 'Todavía no reconozco un concepto del catálogo. '}
            ${sesion.interpretacion?.operacion === 'distinguir' ? 'Parece que querés distinguirlos.'
              : sesion.interpretacion?.operacion === 'relacionar' ? 'Parece que querés relacionarlos.'
              : sesion.interpretacion?.operacion === 'definir' ? 'Parece que buscás una definición.'
              : sesion.interpretacion?.operacion === 'caracterizar' ? 'Parece que preguntás por sus cualidades.'
              : sesion.interpretacion?.operacion === 'evaluar' ? 'Parece que querés evaluar su importancia.'
              : sesion.interpretacion?.operacion === 'justificar' ? 'Parece que buscás una explicación o fundamento.'
              : 'Podemos precisar qué querés examinar.'}</p>
          <p class="hint">Es una primera lectura, no una interpretación confirmada.</p>
          <details id="orientador-diagnostico"><summary>Ver diagnóstico técnico</summary>
            <p>${sesion.analisis.activadores?.map(c => `<span class="lab-chip">${esc(c.palabra)} <small>→ ${esc(c.id)}</small></span>`).join(' ') || 'Sin coincidencias léxicas.'}</p>
            <p>Detección léxica: ${esc(sesion.analisis.intencionDetectada || 'Sin determinar')} · lectura contextual: ${esc(sesion.interpretacion?.operacion || 'Sin determinar')}</p>
            ${sesion.interpretacion?.relacionesSolicitadas.length ? `<p>Comparaciones solicitadas (todavía sin verificar): ${sesion.interpretacion.relacionesSolicitadas.map(r => esc(r.entre.join(' ↔ '))).join('; ')}</p>` : ''}
          </details>
        </section>
        ${sesion.consulta.conceptosRelacionados?.length ? `<p id="orientador-continuidad"><strong>Seguimos con tu pregunta:</strong> tomamos ${esc(S?.N?.[sesion.consulta.tema]?.label || S?.FN?.[sesion.consulta.tema]?.label || sesion.consulta.tema)} como punto de partida y conservamos ${sesion.consulta.conceptosRelacionados.map(id => esc(S?.N?.[id]?.label || S?.FN?.[id]?.label || id)).join(', ')}. Todavía no afirmamos relaciones entre ellos.</p>` : ''}
        ${sesion.estado === 'en_refinamiento' && sesion.consulta.tema && sesion.consulta.intencion ? `<form id="orientador-sentido" class="lab-form">
          <label for="orientador-sentido-texto">¿Querés precisar el sentido de este concepto? (opcional)</label>
          <input id="orientador-sentido-texto" class="lab-input" maxlength="400" value="${esc(sesion.aclaracionSentido || '')}" placeholder="Por ejemplo, disposición como hábito adquirido" required />
          <button class="lab-btn lab-btn--ghost" type="submit">Conservar precisión</button>
        </form>` : ''}
        ${sesion.aclaracionSentido ? `<p><strong>Sentido precisado por el estudiante:</strong> ${esc(sesion.aclaracionSentido)}</p>` : ''}
        ${continuidad ? `<section class="lab-panel" id="orientador-trazabilidad">
          <h3>Continuidad de tu pregunta</h3>
          <p>Primera lectura: <strong>${esc(continuidad.operacionInicial || 'No determinada')}</strong> ·
             operación elegida: <strong>${esc(continuidad.operacionElegida)}</strong>.</p>
          ${continuidad.cambio === 'distinta' ? '<p class="hint">Cambió la operación propuesta inicialmente. Esto no indica si el cambio fue deliberado o sugerido por el bot.</p>' : ''}
          ${continuidad.distincionPendiente ? '<p class="hint">La pregunta inicial pedía distinguir; la consulta final propone relacionar. No son operaciones equivalentes.</p>' : ''}
          ${continuidad.conceptosNoRetomados.length ? `<p class="hint">Conceptos iniciales no incluidos en la consulta final: ${esc(continuidad.conceptosNoRetomados.join(', '))}.</p>` : ''}
          ${continuidad.origenPedagogico === 'phusis' ? '<p class="hint">Elegiste phýsis como origen pedagógico; no es una necesidad inferida del grafo.</p>' : ''}
        </section>` : ''}
        <p><strong>Estado:</strong> ${esc(sesion.estado)} · ${sesion.bitacora.length} decisiones registradas.</p>
        ${actual ? `<div class="lab-panel" aria-live="polite">
          <h3>${esc(actual.texto)}</h3>
          <p class="hint">${esc(actual.aclaracion || (actual.clave === 'intencion' ? 'Podés retomar lo que preguntaste o cambiar el modo de indagación.' : 'Ninguna respuesta modifica el grafo ni el Chat.'))}</p>
          <div class="lab-help" id="orientador-opciones">${actual.opciones.map(o => `<button class="lab-help__item" type="button" data-opcion="${esc(o.valor)}">${esc(o.etiqueta)}${o.fuente === 'hipotesis_inicial' ? '<small> · Retoma tu pregunta inicial</small>' : o.fuente === 'pregunta_inicial' ? `<small> · Mencionado en tu pregunta${o.vinculo ? ` · Arista ${esc(o.vinculo.direccion)}: ${esc(o.vinculo.de)} → ${esc(o.vinculo.a)} (${esc(o.vinculo.relacion || 'sin tipo')})` : ''}</small>` : o.fuente === 'arista_funcional' ? `<small> · Arista ${esc(o.direccion)}: ${esc(o.de)} → ${esc(o.a)} (${esc(o.relacion || 'sin tipo')})${o.ref ? ` · ref. ${esc(o.ref)}` : ''}</small>` : ''}</button>`).join('')}</div>
          ${['tema', 'destino'].includes(actual.clave) ? `<button type="button" class="lab-btn lab-btn--ghost" id="orientador-otra">${entradaLibre ? 'Ocultar búsqueda' : 'Otro concepto…'}</button>
          ${entradaLibre ? `<form id="orientador-libre" class="lab-form">
            <label for="orientador-busqueda">${actual.clave === 'tema' ? '¿Querés comenzar por otro concepto?' : '¿Con qué otro concepto querés vincularlo?'}</label>
            <input id="orientador-busqueda" class="lab-input" type="text" maxlength="400" autocomplete="off" value="${esc(textoLibre)}" required placeholder="Concepto o expresión libre" />
            <div id="orientador-coincidencias" class="lab-help" aria-live="polite"></div>
            <p class="hint">Los resultados incluyen nodos estáticos y funcionales. Las relaciones del grafo se muestran con su dirección; una coincidencia de nombre no implica que exista arista.</p>
            <button type="submit" class="lab-btn">Conservar mi expresión</button>
          </form>` : ''}` : ''}
        </div>` : sesion.estado === 'en_refinamiento' ? '<p class="lab-panel">La consulta está especificada. Podés confirmarla o abandonar el proceso.</p>' : '<p class="lab-panel">La orientación terminó. La bitácora sigue disponible para su examen.</p>'}
        <div class="lab-toolbar">
          ${sesion.estado === 'en_refinamiento' ? `<button type="button" class="lab-btn" id="orientador-conforme">Conforme con la consulta</button>
          <button type="button" class="lab-btn lab-btn--ghost" id="orientador-abandonar">Abandonar</button>` : ''}
          <button type="button" class="lab-btn lab-btn--ghost" id="orientador-reiniciar">Nueva consulta</button>
          <button type="button" class="lab-btn lab-btn--ghost" id="orientador-exportar">Exportar bitácora JSON</button>
          <button type="button" class="lab-btn lab-btn--ghost" id="orientador-copiar">Copiar JSON</button>
        </div>
        ${sesion.estado !== 'en_refinamiento' ? `<section class="lab-panel" id="orientador-evaluacion-panel">
          <h3>Evaluación piloto · para colegas</h3>
          <p class="hint">Opcional. Ayuda a evaluar el diálogo, no la verdad de la respuesta filosófica. No incluyas nombres ni datos personales en el comentario.</p>
          ${registrado ? '<p class="hint">La consulta ya fue registrada. La evaluación no puede modificarse en ese registro; podés exportar el JSON de la sesión.</p>' : `
          <form id="orientador-evaluacion" class="lab-form">
            ${formEvaluacion(sesion.evaluacionPiloto)}
            <label for="orientador-piloto-comentario">¿Qué cambiarías? (opcional)</label>
            <textarea id="orientador-piloto-comentario" name="comentario" class="lab-input" rows="3" maxlength="400" placeholder="Sugerencias sobre términos, opciones o preguntas">${esc(sesion.evaluacionPiloto?.comentario || '')}</textarea>
            <button type="submit" class="lab-btn lab-btn--ghost">${sesion.evaluacionPiloto ? 'Actualizar evaluación' : 'Guardar evaluación en esta sesión'}</button>
          </form>`}
          ${sesion.evaluacionPiloto ? '<p id="orientador-evaluacion-guardada">Evaluación incluida en el JSON de la sesión.</p>' : ''}
          <p id="orientador-evaluacion-estado" role="status"></p>
        </section>
        <section class="lab-panel" id="orientador-registro">
          <h3>Contribuir al repertorio de preguntas</h3>
          <p class="hint">Solo si pulsás Registrar: se guardará la inquietud, la consulta, su trazabilidad descriptiva y, si la completaste, la evaluación piloto. No se guarda identidad ni bitácora íntegra. La coincidencia con FAQ se comprueba en el servidor; no se publica ninguna FAQ automáticamente.</p>
          ${!registrado ? `<button type="button" class="lab-btn lab-btn--ghost" id="orientador-registrar">Registrar esta consulta voluntariamente</button>` : '<p>Consulta registrada.</p>'}
          <p id="orientador-registro-estado" role="status">${esc(registroEstado)}</p>
        </section>` : ''}
        <p class="hint" id="orientador-estado" role="status"></p>
        <div class="lab-panel"><h3>Consulta estructurada</h3>
        <dl class="lab-facts">${Object.entries(sesion.consulta).map(([k,v]) => `<dt>${esc(etiquetas[k] || k)}</dt><dd>${esc(Array.isArray(v) ? (v.length ? v.join(', ') : 'Ninguno elegido') : v === null ? 'No precisado' : v)}</dd>`).join('')}</dl>
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
    el.querySelector('#orientador-sentido')?.addEventListener('submit', event => {
      event.preventDefault();
      try {
        sesion = precisarSentido(sesion, el.querySelector('#orientador-sentido-texto').value);
        render();
      } catch (error) {
        const estado = el.querySelector('#orientador-estado');
        if (estado) estado.textContent = error.message;
      }
    });
    el.querySelectorAll('[data-opcion]').forEach(button => button.addEventListener('click', () => {
      sesion = responderOrientacion(sesion, button.dataset.opcion, S);
      entradaLibre = false; textoLibre = '';
      render();
    }));
    el.querySelector('#orientador-otra')?.addEventListener('click', () => {
      entradaLibre = !entradaLibre; textoLibre = ''; render();
      el.querySelector('#orientador-busqueda')?.focus();
    });
    const campo = el.querySelector('#orientador-busqueda');
    const mostrarCoincidencias = () => {
      const lista = el.querySelector('#orientador-coincidencias');
      if (!lista || !campo) return;
      textoLibre = campo.value;
      const items = buscarConceptos(S, textoLibre, sesion.consulta.tema);
      lista.innerHTML = items.map(o => `<button type="button" class="lab-help__item" data-concepto="${esc(o.valor)}">
        ${esc(o.etiqueta)} <small>${esc(o.clase)} · ${esc(o.valor)}${o.vinculo ? ` · ${esc(o.vinculo.direccion)}: ${esc(o.vinculo.de)} → ${esc(o.vinculo.a)} (${esc(o.vinculo.relacion || 'relación')})` : ' · sin arista directa acreditada'} </small>
      </button>`).join('') || (textoLibre.trim() ? '<p class="hint">Sin coincidencias; podés conservar la expresión escrita.</p>' : '');
      lista.querySelectorAll('[data-concepto]').forEach(btn => btn.addEventListener('click', () => {
        sesion = responderLibre(sesion, campo.value, S, btn.dataset.concepto);
        entradaLibre = false; textoLibre = ''; render();
      }));
    };
    campo?.addEventListener('input', mostrarCoincidencias);
    if (campo) mostrarCoincidencias();
    el.querySelector('#orientador-libre')?.addEventListener('submit', event => {
      event.preventDefault();
      const value = campo.value.trim();
      if (!value) return;
      sesion = responderLibre(sesion, value, S);
      entradaLibre = false; textoLibre = ''; render();
    });
    el.querySelector('#orientador-conforme')?.addEventListener('click', () => { sesion = cerrarOrientacion(sesion, 'conforme'); render(); });
    el.querySelector('#orientador-abandonar')?.addEventListener('click', () => { sesion = cerrarOrientacion(sesion, 'abandonado'); render(); });
    el.querySelector('#orientador-reiniciar')?.addEventListener('click', () => {
      sesion = null; entradaLibre = false; textoLibre = ''; registrado = false; registroEstado = ''; render();
    });
    el.querySelector('#orientador-evaluacion')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      try {
        sesion = registrarEvaluacionPiloto(sesion, {
          version: 1,
          claridad: form.elements.namedItem('claridad').value,
          fidelidad: form.elements.namedItem('fidelidad').value,
          influencia: form.elements.namedItem('influencia').value,
          comentario: form.elements.namedItem('comentario').value,
        });
        render();
      } catch (error) {
        el.querySelector('#orientador-evaluacion-estado').textContent = error.message;
      }
    });
    el.querySelector('#orientador-registrar')?.addEventListener('click', async event => {
      event.currentTarget.disabled = true;
      registroEstado = 'Registrando consulta…';
      const status = el.querySelector('#orientador-registro-estado');
      status.textContent = registroEstado;
      try {
        const response = await fetch('/api/user-queries', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ textoInicial: sesion.textoInicial, consulta: sesion.consulta,
            estado: sesion.estado, bitacora: sesion.bitacora,
            interpretacion: sesion.interpretacion || null, aclaracionSentido: sesion.aclaracionSentido || null,
            evaluacionPiloto: sesion.evaluacionPiloto || null }),
        });
        if (!response.ok) {
          const detalle = await response.json().catch(() => null);
          throw new Error(detalle?.error ? `HTTP ${response.status}: ${detalle.error}`
            : `No se pudo registrar (HTTP ${response.status}).`);
        }
        const result = await response.json();
        registrado = true;
        registroEstado = `Registro #${result.id} · FAQ: ${result.faqMatch} · expresiones nuevas: ${result.aportesLibres}`;
        render();
      } catch (error) {
        registroEstado = error.message;
        status.textContent = registroEstado;
        event.currentTarget.disabled = false;
      }
    });
    el.querySelector('#orientador-exportar')?.addEventListener('click', () => downloadJSON(sesion, 'agora-orientador-v2.json'));
    el.querySelector('#orientador-copiar')?.addEventListener('click', async () => {
      const status = el.querySelector('#orientador-estado');
      try { await copyJSON(sesion); status.textContent = 'Bitácora copiada.'; }
      catch (error) { status.textContent = 'No se pudo copiar: ' + error.message; }
    });
  }
  render();
  return { el, destroy() { sesion = null; } };
}
