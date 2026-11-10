// Auditoría del corpus y revisión editorial de sesión. No escribe en MariaDB.
import { auditCorpus } from '../lab/audit.js';
import { readSession, writeSession, downloadJSON } from '../lab/session.js';
import { esc } from '../ui.js';

export function renderAuditView(S, getTrajectories, panel) {
    const report = auditCorpus(S, getTrajectories());
    const reviews = readSession('reviews', {});
    const issuesByLevel = new Map(['error', 'warning', 'info'].map(level => [level, []]));
    for (const issue of report.issues) issuesByLevel.get(issue.severity)?.push(issue);
    panel.innerHTML = `<section class="lab-card"><h2>Integridad del corpus</h2>
    <p>${report.summary.errors} errores · ${report.summary.warnings} observaciones · ${report.summary.info} notas informativas</p>
    <p class="hint">Las referencias Bekker se comprueban por su presencia, no contra una edición externa. Las advertencias señalan elementos para revisión editorial.</p>
    <button type="button" class="lab-btn" id="audit-export">Exportar diagnóstico y revisión</button>
    ${['error', 'warning', 'info'].map(level => `<details ${level === 'error' ? 'open' : ''}><summary>${{ error: 'Errores', warning: 'Observaciones', info: 'Información' }[level]} (${issuesByLevel.get(level).length})</summary><ul>${issuesByLevel.get(level).map(i => `<li><b>${esc(i.path)}</b>: ${esc(i.message)}</li>`).join('')}</ul></details>`).join('')}
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
