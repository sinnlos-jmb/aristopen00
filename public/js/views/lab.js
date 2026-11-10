import { renderCatalogHeader, renderCatalogCard } from './shared.js';
import { renderTrajectoriesView } from './labTrajectoriesView.js';
import { renderAuditView } from './labAuditView.js';
import { simulate } from '../lab/simulate.js';
import { buildAllTrajectories } from '../lab/trajectories.js';
import { esc } from '../ui.js';
import { readSession, writeSession, downloadJSON, copyJSON } from '../lab/session.js';
import { openTrayectoEditor } from './labTrayectoEditor.js';

// Catálogo de experimentos para la maqueta grid
export const EXPERIMENTS = Object.freeze({
  motor: {
    id: 'motor',
    tab: 1,
    title: 'Inspector del motor',
    desc: 'Probá una pregunta e inspeccioná la interpretación del motor, sus alternativas y el recorrido que produciría el diálogo.',
    tag: 'Diagnóstico',
    icon: '⚙️',
    featured: true
  },
  trayectorias: {
    id: 'trayectorias',
    tab: 2,
    title: 'Visualizador de trayectorias',
    desc: 'Explorá las reglas de trayectorias, el desglose de score y la procedencia de aristas y referencias.',
    tag: 'Árboles lógicos',
    icon: '🌳',
    featured: false
  },
  corpus: {
    id: 'corpus',
    tab: 3,
    title: 'Calidad del corpus',
    desc: 'Auditoría de integridad del corpus, revisión editorial de trayectorias y diagnóstico exportable.',
    tag: 'Integridad',
    icon: '📚',
    featured: false
  },
  editor: {
    id: 'editor',
    tab: 2,
    title: 'Edición del manual',
    desc: 'Curá respuestas, ajustá firmas de preguntas y gestioná trayectos guardados.',
    tag: 'Gestión',
    icon: '✍️',
    featured: false
  }
});

// 1. Vista del catálogo inicial de experimentos
export function createLabCatalogView() {
  const el = document.createElement('div');
  el.className = 'scrollable has-scroll catalog-view';

  const renderCard = exp => renderCatalogCard({
    href: `#/lab/${exp.id}`, ...exp, action: 'Abrir experimento',
  });

  const cardsHtml = Object.values(EXPERIMENTS).map(renderCard).join('');

  el.innerHTML = `
    <div class="catalog-view__content">
      ${renderCatalogHeader({
        eyebrow: 'Entorno de pruebas',
        title: 'Laboratorio de Aristóteles',
        description: 'Probá una pregunta e inspeccioná la interpretación del motor, sus alternativas y el recorrido que produciría el diálogo.',
      })}
      <section class="section catalog-section">
        <div class="card-grid card-grid--catalog" role="list">${cardsHtml}</div>
      </section>
    </div>`;

  return { el };
}

const EXAMPLES = [
  { text: '¿Qué es la felicidad?',                         hint: 'definir + 1 concepto' },
  { text: '¿Qué significa areté?',                         hint: 'definir + 1 concepto' },
  { text: '¿Cómo se relacionan la virtud y la felicidad?', hint: 'relacionar + 2 conceptos' },
  { text: '¿Qué diferencia hay entre placer y felicidad?', hint: 'distinguir + 2 conceptos' },
  { text: '¿Por qué la virtud no basta?',                  hint: 'justificar + 1 concepto' },
  { text: '¿Para qué sirve la política?',                  hint: 'finalidad + 1 concepto' },
  { text: '¿Cuáles son las partes del alma?',              hint: 'enumerar + 1 concepto' },
  { text: '¿Dónde aparece el término érgon?',              hint: 'localizar + 1 concepto' },
];

export function createLabView(App, opts = {}) {
  const S = App.S;

  // Mapeo inteligente del experimento recibido por opciones o URL
  let initialTab = opts.exp;
  if (typeof opts.exp === 'string' && EXPERIMENTS[opts.exp]) {
    initialTab = EXPERIMENTS[opts.exp].tab;
  }

  let activeTab = [1, 2, 3].includes(initialTab) ? initialTab : readSession('tab', 1);
  if (![1, 2, 3].includes(activeTab)) activeTab = 1;
  const savedHistory = readSession('history', []);
  const history = Array.isArray(savedHistory) ? savedHistory.filter(h => typeof h.text === 'string').slice(0, 20) : [];
  let lastQuestion = readSession('last-question', '');
  let latestResult = null;
  let closeEditor = null;
  let trajectoryCache = null;
  let bestByFaq = new Map();
  const getTrajectories = () => trajectoryCache || (trajectoryCache = buildAllTrajectories(S));
  const el = document.createElement('div');
  el.className = 'view-lab';

  function renderExp1() {
    return `
    <section class="lab-card">
    <h2>Entrada</h2>
    <p class="hint">Probá una pregunta para inspeccionar conceptos, intención, selección de FAQ y el recorrido real del diálogo.</p>
    <form class="lab-form" id="lab-form">
    <input id="lab-input" class="lab-input" type="text"
    placeholder="Escribí una expresión…" autocomplete="off" />
    <button type="submit" class="lab-btn">Analizar</button>
    <button type="button" class="lab-btn lab-btn--ghost" id="lab-clear">Limpiar</button>
    </form>
    <div class="lab-output">
    <div class="lab-panel" id="lab-concepts">
    <div class="lab-panel__label">Conceptos detectados</div>
    <div class="lab-empty">—</div>
    </div>
    <div class="lab-panel" id="lab-modes">
    <div class="lab-panel__label">Modos detectados</div>
    <div class="lab-empty">—</div>
    </div>
    </div>
    <div id="lab-diagnosis" class="lab-diagnostics" aria-live="polite"></div>
    <div class="lab-panel lab-panel--spaced">
    <div class="lab-panel__label">Salida estructurada</div>
    <div class="lab-toolbar"><button type="button" class="lab-btn lab-btn--ghost" id="lab-copy">Copiar JSON</button><button type="button" class="lab-btn lab-btn--ghost" id="lab-export">Exportar prueba</button><button type="button" class="lab-btn lab-btn--ghost" id="lab-export-history">Exportar historial</button><button type="button" class="lab-btn lab-btn--ghost" id="lab-clear-history">Borrar historial</button></div>
    <p id="lab-transfer-status" role="status"></p>
    <pre class="lab-json" id="lab-json">—</pre>
    </div>
    </section>
    <section class="lab-card">
    <h2>Patrones de ejemplo</h2>
    <p class="hint">Hacé click en un ejemplo para probarlo.</p>
    <div class="lab-help" id="lab-help">
    ${EXAMPLES.map(ex => `
    <button type="button" class="lab-help__item" data-example="${esc(ex.text)}">
    <b>${esc(ex.hint)}</b>
    <span>"${esc(ex.text)}"</span>
    </button>`).join('')}
    </div>
    </section>
    <section class="lab-card">
    <h3>Últimas pruebas</h3>
    <div id="lab-history"><div class="lab-empty">Todavía no hay pruebas.</div></div>
    </section>`;
  }

function render() {
    closeEditor?.();
    closeEditor = null;
    const tabNames = ['Motor del diálogo', 'Trayectorias', 'Calidad del corpus'];
    const currentExpTitle = tabNames[activeTab - 1];

    el.innerHTML = `

    <div class="lab__inner">

      <!-- 3. AJUSTE: BOTONERA COMPLETA DEBAJO DEL HEADER PRINCIPAL -->
      <nav class="lab-nav" role="tablist" aria-label="Navegación del Laboratorio">
        <a href="#/lab" class="btn btn--ghost btn--sm lab-nav__button">
          ← Catálogo
        </a>
        <div class="lab-nav__divider" aria-hidden="true"></div>
        ${tabNames.map((name, i) => `
          <button type="button" role="tab" id="lab-tab-${i + 1}"
            aria-controls="lab-panel"
            aria-selected="${activeTab === i + 1}"
            tabindex="${activeTab === i + 1 ? 0 : -1}"
            class="btn btn--sm lab-nav__button ${activeTab === i + 1 ? 'btn--primary' : 'btn--ghost'}"
            data-tab="${i + 1}">
            ${name}
          </button>
        `).join('')}
      </nav>

      <!-- 4. AJUSTE: TÍTULO DINÁMICO DEL EXPERIMENTO -->
      <header class="lab-exp__header">
        <h1 class="lab-exp__title">
          ${currentExpTitle}
        </h1>
      </header>

      <!-- CONTENIDO DEL EXPERIMENTO -->
      <div class="lab-tab-content" id="lab-panel" role="tabpanel" tabindex="0" aria-labelledby="lab-tab-${activeTab}">
        ${activeTab === 1 ? renderExp1() : activeTab === 2 ? renderTrajectoriesView(App, getTrajectories, bestByFaq) : ''}
      </div>

    </div>`;

    bindCommon();
    if (activeTab === 1) bindExp1();
    if (activeTab === 2) bindExp2();
    if (activeTab === 3) renderAuditView(S, getTrajectories, el.querySelector('#lab-panel'));
  }

  function bindCommon() {
    el.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = parseInt(btn.dataset.tab, 10);
        if (n === activeTab) return;
        activeTab = n;
        writeSession('tab', n);
        render();
        el.querySelector(`[data-tab="${n}"]`).focus();
      });
      btn.addEventListener('keydown', event => {
        const tabs = [1, 2, 3];
        let next = activeTab;
        if (event.key === 'ArrowRight') next = tabs[activeTab % tabs.length];
        else if (event.key === 'ArrowLeft') next = tabs[(activeTab + tabs.length - 2) % tabs.length];
        else if (event.key === 'Home') next = 1;
        else if (event.key === 'End') next = 3;
        else return;
        event.preventDefault();
        el.querySelector(`[data-tab="${next}"]`).click();
      });
    });
  }

  function bindExp2() {
    el.querySelectorAll('[data-edit-trayecto]').forEach(btn => {
      btn.addEventListener('click', () => {
        const faqId = btn.dataset.editTrayecto;
        const faq = App.S.FAQ[faqId];
        const bestTraj = bestByFaq.get(faqId) || null;
        if (faq) {
          closeEditor?.();
          const modal = openTrayectoEditor(App, faq, bestTraj);
          closeEditor = modal?.destroy || null;
        }
      });
    });
  }

  function bindExp1() {
    const input      = el.querySelector('#lab-input');
    const form       = el.querySelector('#lab-form');
    const conceptsEl = el.querySelector('#lab-concepts');
    const modesEl    = el.querySelector('#lab-modes');
    const jsonEl     = el.querySelector('#lab-json');
    const helpEl     = el.querySelector('#lab-help');
    const historyEl  = el.querySelector('#lab-history');

    function renderResult(simulation) {
      latestResult = simulation;
      const diagnostic = simulation.diagnosis;
      const result = diagnostic.analysis;
      conceptsEl.innerHTML = `<div class="lab-panel__label">Conceptos detectados</div>${
      result.conceptos.length
      ? result.conceptos.map(c => `<span class="lab-chip">${esc(c.word)} <small>→ ${esc(c.id)}</small></span>`).join('')
      : '<div class="lab-empty">Ningún concepto reconocido.</div>'
      }`;
      modesEl.innerHTML = `<div class="lab-panel__label">Modos detectados</div>${
      result.modos.length
      ? result.modos.map(m => `<span class="lab-chip lab-chip--mode">${esc(m.label)} <small>${esc(m.id)}${m.id === diagnostic.primaryMode ? ' · principal' : ' · secundario'}</small></span>`).join('')
      : '<div class="lab-empty">Ningún modo reconocido.</div>'
      }`;
      jsonEl.textContent = JSON.stringify(simulation, null, 2);
      const labels = { safe: 'Coincidencia segura', weak: 'Coincidencia débil · concepto', ambiguous: 'Pregunta ambigua', none: 'Sin resultado' };
      const selected = diagnostic.candidates.find(c => c.id === diagnostic.goal?.id && diagnostic.goal?.type === 'faq');
      el.querySelector('#lab-diagnosis').innerHTML = `
      <section class="lab-panel">
      <h3>Decisión del detector</h3>
      <p><b>${esc(labels[diagnostic.status] || diagnostic.status)}</b></p>
      <p>${esc(diagnostic.reason)}</p>
      <dl class="lab-facts">
      <dt>Texto normalizado</dt><dd>${esc(diagnostic.normalized)}</dd>
      <dt>Objetivo propuesto</dt><dd>${esc(diagnostic.goal?.label || 'Ninguno: se pide aclaración')} ${diagnostic.goal ? `(${esc(diagnostic.goal.type)})` : ''}</dd>
      <dt>Subunidad objetivo</dt><dd>${esc(diagnostic.goal?.targetSub || '—')}</dd>
      <dt>Score / margen</dt><dd>${selected ? selected.score.toFixed(2) : '—'} / ${diagnostic.margin.toFixed(2)}</dd>
      <dt>Firma seleccionada</dt><dd>${selected?.signature ? esc(JSON.stringify(selected.signature.firma)) : '—'}</dd>
      <dt>Definición activada</dt><dd>${esc(simulation.definition?.meta?.titulo || 'Ninguna')}</dd>
      </dl>
      <p class="hint">Umbrales: segura ≥ ${diagnostic.thresholds.safeScore}, débil ≥ ${diagnostic.thresholds.weakScore}, margen ≥ ${diagnostic.thresholds.minMargin}. Son reglas de selección, no probabilidades. Las coincidencias exactas tienen prioridad. Un concepto sin FAQ requiere confirmación.</p>
      </section>
      <section class="lab-panel">
      <h3>Candidatas y alternativas descartadas</h3>
      <div class="lab-ranking-wrap"><table class="lab-ranking">
      <thead><tr><th>FAQ</th><th>Texto</th><th>Conceptos</th><th>Modo</th><th>Penalización</th><th>Total</th><th>Evaluación</th></tr></thead>
      <tbody>${diagnostic.candidates.slice(0, 8).map(c => `<tr>
      <td>${esc(c.label)}<details><summary>Firma y argumentos</summary><pre>${esc(JSON.stringify(c.signature, null, 2))}</pre></details></td>
      <td>${c.textScore.toFixed(2)}${c.exactSource ? ' · exacta' : ''}</td><td>${c.conceptScore.toFixed(2)}</td>
      <td>${c.modeScore.toFixed(2)}</td><td>${c.penalty.toFixed(2)}</td><td>${c.score.toFixed(2)}</td>
      <td>${esc(c.id === selected?.id ? 'Seleccionada' : c.reasons.join(' ') || 'Compatible; no supera el ranking o el umbral.')}</td>
      </tr>`).join('')}</tbody></table></div>
      </section>
      <section class="lab-panel">
      <h3>Plan real del diálogo (${simulation.plan.length} pasos)</h3>
      ${simulation.plan.length ? `<ol>${simulation.plan.map(s => `<li>${esc(s.id)} · ${esc(s.titulo)}</li>`).join('')}</ol>` : '<p>No se genera un recorrido hasta resolver la aclaración.</p>'}
      </section>
      <section class="lab-panel">
      <h3>Vista previa del diálogo</h3>
      <p class="hint">Instancia aislada del bot. Si hay definición, se simula «Profundizar»; luego se elige «Seguir». Las aclaraciones quedan pendientes, como en el chat.</p>
      ${simulation.messages.map(m => `<article class="lab-preview-message">
      <b>${esc(m.meta?.titulo || m.kind)}</b>
      ${m.meta?.ref ? `<p>${esc(m.meta.ref)}</p>` : ''}
      <p class="lab-preview-text">${esc(m.text)}</p>
      ${m.options?.length ? `<p class="hint">Opciones: ${m.options.map(o => esc(o.label)).join(' · ')}</p>` : ''}
      </article>`).join('')}
      </section>`;
    }

    function pushHistory(text, result) {
      history.unshift({ text, status: result.diagnosis.status, goal: result.diagnosis.goal?.label || 'sin objetivo', timestamp: new Date().toISOString(), result });
      if (history.length > 20) history.pop();
      lastQuestion = text;
      writeSession('last-question', text);
      const persisted = writeSession('history', history);
      if (!persisted) el.querySelector('#lab-transfer-status').textContent = 'No se pudo conservar el historial en esta sesión; podés exportarlo.';
      renderHistory();
    }

    function renderHistory() {
      historyEl.innerHTML = history.map(h => {
        const modesStr = `${h.status} · ${h.goal}`;
        return `<button type="button" data-history="${esc(h.text)}" class="lab-history__item">
        <b>${esc(h.text)}</b><span class="mode">${esc(modesStr)}</span>
        </button>`;
      }).join('') || '<p class="lab-empty">Todavía no hay pruebas.</p>';
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      const result = simulate(S, text);
      renderResult(result);
      pushHistory(text, result);
    });

    el.querySelector('#lab-clear').addEventListener('click', () => {
      input.value = ''; input.focus();
      conceptsEl.innerHTML = `<div class="lab-panel__label">Conceptos detectados</div><div class="lab-empty">—</div>`;
      modesEl.innerHTML = `<div class="lab-panel__label">Modos detectados</div><div class="lab-empty">—</div>`;
      jsonEl.textContent = '—';
      el.querySelector('#lab-diagnosis').replaceChildren();
      latestResult = null;
      lastQuestion = '';
      writeSession('last-question', '');
    });

    helpEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-example]');
      if (!btn) return;
      input.value = btn.dataset.example;
      input.focus();
      const result = simulate(S, input.value);
      renderResult(result);
      pushHistory(input.value, result);
    });

    historyEl.addEventListener('click', e => {
      const item = e.target.closest('[data-history]');
      if (!item) return;
      input.value = item.dataset.history;
      renderResult(simulate(S, input.value));
      lastQuestion = input.value;
      writeSession('last-question', lastQuestion);
    });

    const transferStatus = el.querySelector('#lab-transfer-status');
    el.querySelector('#lab-copy').addEventListener('click', async () => {
      if (!latestResult) { transferStatus.textContent = 'Primero analizá una pregunta.'; return; }
      try { await copyJSON(latestResult); transferStatus.textContent = 'JSON copiado.'; }
      catch (error) { transferStatus.textContent = error.message; }
    });

    el.querySelector('#lab-export').addEventListener('click', () => {
      if (latestResult) downloadJSON(latestResult, 'prueba-motor.json');
      else transferStatus.textContent = 'Primero analizá una pregunta.';
    });

    el.querySelector('#lab-export-history').addEventListener('click', () => downloadJSON(history, 'historial-lab.json'));
    el.querySelector('#lab-clear-history').addEventListener('click', () => { history.length = 0; writeSession('history', []); renderHistory(); });

    renderHistory();
    if (lastQuestion) { input.value = lastQuestion; renderResult(simulate(S, lastQuestion)); }
  }

  render();
  return {
    el,
    destroy() { closeEditor?.(); closeEditor = null; },
  };
}
