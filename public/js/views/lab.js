import { renderCatalogHeader, renderCatalogCard } from './shared.js';
import { simulate } from '../lab/simulate.js';
import { buildAllTrajectories, renderTrajectorySVG } from '../lab/trajectories.js';
import { composeStep } from '../bot/composer.js';
import { esc } from '../ui.js';
import { auditCorpus } from '../lab/audit.js';
import { readSession, writeSession, downloadJSON, copyJSON } from '../lab/session.js';
import { openTrayectoEditor } from './labTrayectoEditor.js';
import { getTrayectos } from '../lab/trayectos.js';

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

function buildComposedPreview(S, adj, traj) {
  const manual = S.manual || { por_concepto: {}, por_arista: {} };
  const path = traj.path;
  const pathSet = new Set(path);
  const steps = [];
  let prevUnit = null;
  for (let i = 1; i < path.length - 1; i++) {
    const conceptId = path[i];
    const prevConceptId = i > 1 ? path[i - 1] : null;
    const nu = S.NODE_UNIT?.[conceptId];
    const sub = nu ? S.SUB[nu.sub] : null;
    if (!sub) continue;
    const prevSubId = prevConceptId ? S.NODE_UNIT?.[prevConceptId]?.sub : null;
    const composedText = composeStep(S, manual, conceptId, prevConceptId, sub, { prevSubId });
    const laterals = (adj.get(conceptId) || [])
      .filter(e => !pathSet.has(e.to))
      .map(e => ({ id: e.to, label: S.FN[e.to]?.label || e.to, rel: e.edge.rel }))
      .slice(0, 4);
    const unitChanged = nu?.unidad && nu.unidad !== prevUnit;
    const unit = nu?.unidad ? S.U[nu.unidad] : null;
    steps.push({
      conceptId,
      label: S.FN[conceptId]?.label || conceptId,
      sub: { id: sub.id, titulo: sub.titulo, bekker: sub.bekker, intro: sub.intro, unidad: sub.unidad },
      composedText,
      unitChanged,
      unit: unit ? { id: unit.id, titulo: unit.titulo, resumen: unit.resumen || '' } : null,
      laterals,
      progress: steps.length + 1,
    });
    if (nu?.unidad) prevUnit = nu.unidad;
  }
  return steps;
}

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

  function renderExp2() {
    bestByFaq.clear();
    if (!App.S) return `<section class="lab-card"><p class="hint">Cargando datos…</p></section>`;
    const { trajectories, error } = getTrajectories();
    if (error) {
      return `<section class="lab-card">
      <h2>Datos insuficientes</h2>
      <p class="hint">${esc(error)}. Serví <code>funcional_v1.json</code> y
      <code>estatico_v1.json</code> en <code>public/data/</code>, además de
      <code>tags_v4.json</code>, y recargá.</p>
      </section>`;
    }
    const fadj = new Map();
    for (const id of Object.keys(S.FN || {})) fadj.set(id, []);
    for (const e of S.FE || []) {
      if (!fadj.has(e.de) || !fadj.has(e.a)) continue;
      fadj.get(e.de).push({ to: e.a, edge: e });
      fadj.get(e.a).push({ to: e.de, edge: e });
    }
    const cards = trajectories.map(({ faq, spotlights, primaryFocus, candidates }) => {
      const best = candidates[0] || null;
      if (best) bestByFaq.set(faq.id, best);
      const trayectoCount = getTrayectos(faq.id).length;
      const editRow = `<div class="traj-card__edit-row">
      <button type="button" class="lab-btn lab-btn--ghost" data-edit-trayecto="${esc(faq.id)}">✎ Editar trayecto</button>
      ${trayectoCount ? `<span class="hint">${trayectoCount} guardado(s)</span>` : ''}
      </div>`;
      if (!candidates.length) {
        return `<article class="traj-card">
        <header class="traj-card__head">
        <div class="traj-card__q">${esc(faq.pregunta)}</div>
        <div class="traj-card__meta">No se encontró una trayectoria phusis → foco principal → theion dentro de los límites de búsqueda.</div>
        </header>
        ${editRow}
        </article>`;
      }
      const alts = candidates.slice(1, 4);
      const composedPreview = buildComposedPreview(S, fadj, best);
      const orderedSpotlights = [...spotlights].sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (b.isPrimary && !a.isPrimary) return 1;
        if (a.isFunctional !== b.isFunctional) return a.isFunctional ? -1 : 1;
        return 0;
      });
      const focusBadges = orderedSpotlights.length
        ? orderedSpotlights.map(sp => {
            const cls = 'traj-focus'
              + (sp.isPrimary ? ' traj-focus--primary' : '')
              + (sp.isFunctional ? ' traj-focus--fn' : '');
            const icon = sp.isPrimary ? '★' : sp.isFunctional ? '◆' : '○';
            const title = `${sp.gr || sp.id} · ${sp.isPrimary ? 'FOCO PRINCIPAL' : sp.isFunctional ? 'foco funcional' : 'foco estático'}`;
            return `<span class="${cls}" title="${esc(title)}">${icon} ${esc(sp.label)}</span>`;
          }).join(' ')
        : '<span class="traj-focus traj-focus--none">sin focos</span>';
      const uncovered = best.uncovered || [];
      const primaryId = primaryFocus?.id || null;
      const primaryUncovered = primaryId && uncovered.some(u => u.id === primaryId);
      const secondaryUncovered = uncovered.filter(u => u.id !== primaryId);
      return `<article class="traj-card">
      <header class="traj-card__head">
      <div class="traj-card__q">${esc(faq.pregunta)}</div>
      <div class="traj-card__meta">
      ${best.n} pasos · score ${best.total.toFixed(2)}
      · asc ${(best.ascRatio * 100).toFixed(0)}%
      · refs ${(best.refRatio * 100).toFixed(0)}%
      · areté ${esc(best.motorPos)}
      · cobertura FN ${(best.coverageFN * 100).toFixed(0)}%
      · estáticos ${(best.coverageStatic * 100).toFixed(0)}%
      · unidades ${best.uniqueUnits} (${best.unitSwitches} saltos)
      </div>
      <div class="traj-card__focus">
      <span class="traj-card__focus-label">Focos:</span> ${focusBadges}
      </div>
      </header>
      ${editRow}
      ${primaryUncovered ? `<div class="traj-alert">
      ⚠ El <b>foco principal</b> (${esc(primaryFocus.label)}) no está en el path.
      Esto no debería ocurrir con el pipeline actual; revisar.
      </div>` : ''}
      <div class="traj-diagram">${renderTrajectorySVG(best, S)}</div>
      ${secondaryUncovered.length ? `<div class="traj-uncovered">
      <b>Sin cubrir:</b>
      ${secondaryUncovered.map(sp =>
        `<span class="traj-focus traj-focus--miss" title="ancla ${esc(sp.anchor || '—')}">${esc(sp.label)}</span>`
      ).join(' ')}
      <span class="traj-uncovered__hint">
      — el path no pasa por su ancla funcional
      (${esc([...new Set(secondaryUncovered.map(u => u.anchor).filter(Boolean))].join(', ') || 'ninguna')})
      </span>
      </div>` : ''}
      ${alts.length ? `<details class="traj-detail">
      <summary>${alts.length} alternativas</summary>
      <div class="traj-alts">
      ${alts.map((a, i) => `
      <div class="traj-alt">
      <div class="traj-alt__head">#${i + 2} · score ${a.total.toFixed(2)}
      · ${a.n} pasos · cobertura estáticos ${(a.coverageStatic * 100).toFixed(0)}%</div>
      <div class="traj-diagram traj-diagram--small">
      ${renderTrajectorySVG(a, S)}
      </div>
      </div>`).join('')}
      </div>
      </details>` : ''}
      <details class="traj-detail">
      <summary>Desglose del score</summary>
      <ul class="traj-breakdown">
      <li><b>Componentes del total:</b> estructura ${best.scoreBreakdown.structural.toFixed(2)} + cobertura ${best.scoreBreakdown.coverage.toFixed(2)} + unidades ${best.scoreBreakdown.units.toFixed(2)} + foco ${best.scoreBreakdown.primary.toFixed(2)}</li>
      <li><b>Aristas recorridas en sentido inverso:</b> ${best.reversed} (penalización de 0,25 por arista)</li>
      <li><b>Ascendentes:</b> ${best.asc}/${best.n}</li>
      <li><b>Mediadoras:</b> ${best.med}/${best.n}</li>
      <li><b>Laterales:</b> ${best.lat}/${best.n}</li>
      <li><b>Voz promedio:</b> ${best.vozAvg.toFixed(2)}</li>
      <li><b>Refs Bekker:</b> ${best.refCount}/${best.n}</li>
      <li><b>Areté:</b> ${best.motorTouches} toque(s), posición <em>${esc(best.motorPos)}</em></li>
      <li><b>Cobertura FN:</b> ${(best.coverageFN * 100).toFixed(0)}%</li>
      <li><b>Cobertura estáticos:</b> ${(best.coverageStatic * 100).toFixed(0)}%</li>
      <li><b>Unidades:</b> ${best.uniqueUnits} · ${best.unitSwitches} saltos
      · coherencia ${(best.unitCoherence * 100).toFixed(0)}%</li>
      <li><b>Momentos:</b> ${best.inversions} inversión(es)
      · orden ${(best.momentOrder * 100).toFixed(0)}%</li>
      <li><b>Densidad:</b> ${best.avgPerUnit.toFixed(1)} pasos/unidad
      · score ${(best.densityScore * 100).toFixed(0)}%</li>
      </ul>
      </details>
      <details class="traj-detail"><summary>Procedencia de aristas y referencias</summary>
      <ul>${best.edges.map(({ edge, dir }) => `<li>${esc(edge.de)} → ${esc(edge.a)} · ${esc(edge.rel)} · voz ${esc(edge.voz || 'sin especificar')} · ${esc(edge.ref || 'sin referencia')} ${dir === -1 ? '· recorrida en sentido inverso' : ''}</li>`).join('')}</ul>
      </details>
      <details class="traj-detail traj-chat-preview">
      <summary>Composición experimental de esta trayectoria (${composedPreview.length} pasos)</summary>
      <p class="hint">Esta trayectoria funcional es una lectura experimental. El plan efectivo del bot se consulta en Motor del diálogo.</p>
      <div class="chat-preview">
      <div class="chat-preview__flow">
      ${composedPreview.map((step, i) => `
      ${step.unitChanged && step.unit ? `<div class="chat-preview__chapter">${esc(step.unit.titulo)}</div>` : ''}
      <div class="chat-preview__step">
      <div class="chat-preview__meta">
      ${esc(step.sub?.bekker?.join('–') || step.label)}
      · ${esc(step.sub?.titulo || step.label)}
      · ${i + 1}/${composedPreview.length}
      </div>
      <div class="chat-preview__text">${esc(step.composedText || '—')}</div>
      </div>
      `).join('')}
      </div>
      ${composedPreview.some(s => s.laterals.length) ? `
      <div class="chat-preview__lateral-section">
      <div class="chat-preview__lateral-heading">Conexiones funcionales fuera de esta trayectoria</div>
      ${composedPreview.map((step, i) => step.laterals.length ? `
      <div class="chat-preview__lateral-row">
      <span class="chat-preview__lateral-step">Paso ${i + 1}</span>
      ${step.laterals.map(l =>
        `<span class="chat-preview__lateral-item">Explorar: ${esc(l.label)}</span>`
      ).join('')}
      </div>
      ` : '').join('')}
      </div>
      ` : ''}
      </div>
      </details>
      </article>`;
    }).join('');
    return `
    <section class="lab-card lab-intro-card">
    <h2>Regla de trayectorias</h2>
    <details class="traj-detail"><summary>Datos del corpus y decisiones interpretativas del score</summary>
    <p>El corpus aporta nodos, aristas, voz, referencias y pasajes. La clasificación de relaciones, los polos phusis/theion y todos los pesos son reglas interpretativas del proyecto; el score no equivale a corrección filosófica.</p>
    <p>Estructura: ascendentes × 2 + mediadoras × 0,8 + voz media × 0,5 + proporción de referencias × 0,8 + bono areté × 1,2 + longitud × 0,5 − laterales × 0,3 − inversas × 0,25. Voz: textual 1; comentarista 0,6; nuestra 0,3. El sentido inverso no convierte una relación en una afirmación textual inversa.</p>
    <p>Cobertura: funcional × 0,8 + estática × 1. Unidades: coherencia × 0,4 + orden de momentos × 0,5 + densidad × 0,3. Foco principal cubierto: +1,5. El manual no modifica estos valores.</p>

       <p class="hint">
    Cada trayectoria parte de <b>φύσις</b> y culmina en <b>τὸ θεῖον</b>.
    <b>El foco principal</b> (★, el <code>arbol.nodo</code> de la FAQ o el
    primer foco funcional) es <b>obligatorio</b>: si ningún path lo
    incluye, se generan paths forzados por segmentos
    (<code>phusis → foco</code> + <code>foco → theion</code>).
    Los demás focos son <b>preferidos</b> y suman al score.
    </p>
    <div class="traj-legend">${legendItems()}</div>

    </details>
 
    </section>
    <section class="lab-card">
    <h2>Trayectorias por pregunta (${trajectories.length})</h2>
    <p class="hint">La primera es la recomendada; las alternativas muestran
    otras lecturas posibles. El acordeón de la respuesta compone el texto
    con el manual activo y el compositor del chat. El plan del diálogo se calcula por separado.
    Usá «✎ Editar trayecto» para curar el contenido de cada FAQ.</p>
    <div class="traj-list-wrap">${cards}</div>
    </section>`;
  }

  function legendItems() {
    return `
    <span class="traj-legend__item">
    <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" class="traj-node--origin"/></svg>
    Origen (phusis)
    </span>
    <span class="traj-legend__item">
    <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="7" class="traj-node--step"/></svg>
    Paso
    </span>
    <span class="traj-legend__item">
    <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="7" class="traj-node--motor"/></svg>
    Areté presente
    </span>
    <span class="traj-legend__item">
    <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" class="traj-node--end"/></svg>
    Fin (theion)
    </span>
    <span class="traj-legend__item">
    <svg width="22" height="22" viewBox="0 0 22 22">
    <circle cx="11" cy="11" r="7" class="traj-node--primary"/>
    <circle cx="11" cy="11" r="10" fill="none" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="2 2"/>
    </svg>
    Foco principal (★)
    </span>
    <span class="traj-legend__item">
    <svg width="30" height="22" viewBox="0 0 30 22"><line x1="3" y1="11" x2="27" y2="11" class="traj-edge--motor-line"/></svg>
    Areté motoriza
    </span>
    <span class="traj-legend__item">
    <svg width="30" height="22" viewBox="0 0 30 22"><line x1="3" y1="11" x2="27" y2="11" class="traj-edge--normal-line"/></svg>
    Sin areté
    </span>
    <span class="traj-legend__item">
    <svg width="30" height="22" viewBox="0 0 30 22">
    <rect x="2" y="6" width="26" height="10" rx="5" fill="rgba(201,169,106,.15)" stroke="rgba(201,169,106,.45)"/>
    <text x="15" y="13.5" text-anchor="middle" font-size="7" fill="var(--gold)" font-style="italic">vía …</text>
    </svg>
    Ancla de foco
    </span>`;
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
        ${activeTab === 1 ? renderExp1() : activeTab === 2 ? renderExp2() : ''}
      </div>

    </div>`;
    
    bindCommon();
    if (activeTab === 1) bindExp1();
    if (activeTab === 2) bindExp2();
    if (activeTab === 3) renderAudit();
  }

  function renderAudit() {
    const report = auditCorpus(S, getTrajectories());
    const reviews = readSession('reviews', {});
    const panel = el.querySelector('#lab-panel');
    panel.innerHTML = `<section class="lab-card"><h2>Integridad del corpus</h2>
    <p>${report.summary.errors} errores · ${report.summary.warnings} observaciones · ${report.summary.info} notas informativas</p>
    <p class="hint">Las referencias Bekker se comprueban por su presencia, no contra una edición externa. Las advertencias señalan elementos para revisión editorial.</p>
    <button type="button" class="lab-btn" id="audit-export">Exportar diagnóstico y revisión</button>
    ${['error', 'warning', 'info'].map(level => `<details ${level === 'error' ? 'open' : ''}><summary>${{ error: 'Errores', warning: 'Observaciones', info: 'Información' }[level]} (${report.issues.filter(i => i.severity === level).length})</summary><ul>${report.issues.filter(i => i.severity === level).map(i => `<li><b>${esc(i.path)}</b>: ${esc(i.message)}</li>`).join('')}</ul></details>`).join('')}
    </section><section class="lab-card"><h2>Revisión editorial de trayectorias</h2><p class="hint">Inspeccioná los recorridos en Trayectorias y registrá aquí tu evaluación y notas. Se conservan durante esta sesión.</p>
    ${report.reviews.map((r, i) => `<article class="lab-review"><h3>${esc(r.question)}</h3><p>${esc(r.path.join(' → ') || 'Sin trayectoria')}</p><p>Score: ${r.score?.toFixed(2) || '—'} · foco ${r.primaryCovered ? 'cubierto' : 'sin cubrir'} · inversas ${r.reversed} · voces: ${esc([...new Set(r.voices)].join(', '))}</p>
    <label for="review-state-${i}">Evaluación</label><select id="review-state-${i}" data-review="${esc(r.faq)}" data-field="status">${['Pendiente', 'Revisada', 'Requiere corrección'].map(v => `<option ${reviews[r.faq]?.status === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <label for="review-note-${i}">Notas de lectura</label><textarea id="review-note-${i}" data-review="${esc(r.faq)}" data-field="notes">${esc(reviews[r.faq]?.notes || '')}</textarea></article>`).join('')}</section>`;
    panel.querySelectorAll('[data-review]').forEach(field => field.addEventListener('input', () => {
      const id = field.dataset.review;
      reviews[id] = { ...reviews[id], [field.dataset.field]: field.value };
      writeSession('reviews', reviews);
    }));
    panel.querySelector('#audit-export').addEventListener('click', () => downloadJSON({ ...report, editorialReviews: reviews }, 'diagnostico-corpus.json'));
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