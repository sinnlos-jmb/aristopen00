// Presentación de trayectorias del Laboratorio. No cambia el modelo ni la edición.
import { renderTrajectorySVG } from '../lab/trajectories.js';
import { composeStep } from '../bot/composer.js';
import { esc } from '../ui.js';
import { getTrayectos } from '../lab/trayectos.js';

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

export function renderTrajectoriesView(App, getTrajectories, bestByFaq) {
  const S = App.S;
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
