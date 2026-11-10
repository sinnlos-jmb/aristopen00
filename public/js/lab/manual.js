import { simulate } from './simulate.js';
import { validateManual } from './audit.js';
import { buildAllTrajectories } from './trajectories.js';
import { composeStep, getStepLateralNotes } from '../bot/composer.js';
import { resolveSub, expandStep } from '../bot/graph.js';

export function compareManual(S, manual, question, trajectories = buildAllTrajectories(S)) {
  const issues = validateManual(manual, S);
  if (issues.length) return { issues };
  const baseline = simulate(S, question);
  const editedStore = { ...S, manual };
  const edited = simulate(editedStore, question);
  const goal = baseline.diagnosis.goal;
  const trajectory = goal?.type === 'faq' ? trajectories.trajectories.find(t => t.faq.id === goal.id)?.candidates[0] : null;
  const score = simulation => simulation.diagnosis.goal?.type === 'faq'
    ? simulation.diagnosis.candidates.find(c => c.id === simulation.diagnosis.goal.id)?.score ?? null : null;
  const steps = baseline.plan.map((step, i) => {
    // resolveSub cubre pasos atómicos y fusionados (sub sintético)
    const sub = resolveSub(S, step.id) || S.SUB[step.id];
    const concept = sub?.conceptos_clave?.[0];
    const prevSubId = baseline.plan[i - 1]?.id || null;
    const prevSub = prevSubId ? resolveSub(S, prevSubId) : null;
    const previous = prevSub?.conceptos_clave?.[0] || null;
    const source = m => m?.por_subunidad?.[step.id]?.exposicion?.trim() ? 'exposición del manual'
      : !i && m?.por_concepto?.[concept]?.apertura?.trim() ? 'apertura del manual' : 'texto del corpus';
    const detail = (store, m) => {
      const seen = new Set();
      const notes = [
        ...getStepLateralNotes(store, m, step.id, concept),
        ...expandStep(store, step.id).flatMap(aid => getStepLateralNotes(store, m, aid, null)),
      ].filter(nl => !seen.has(nl.id) && seen.add(nl.id));
      return { source: source(m),
        text: composeStep(store, m, concept, previous, sub, { prevSubId }),
        notes };
    };
    const before = detail(S, S.manual);
    const after = detail(editedStore, manual);
    return { ...step, before, after, changed: JSON.stringify(before) !== JSON.stringify(after) };
  });
  const coverage = side => steps.length ? steps.filter(s => s[side].source !== 'texto del corpus').length / steps.length * 100 : null;
  return { issues, question, baseline, edited,
    metrics: { detection: { before: score(baseline), after: score(edited) },
      trajectory: { before: trajectory?.total ?? null, after: trajectory?.total ?? null },
      editorialCoverage: { before: coverage('before'), after: coverage('after') } },
    trajectory: trajectory ? { path: trajectory.path, breakdown: trajectory.scoreBreakdown } : null,
    steps, changedSteps: steps.filter(s => s.changed).length,
    explanation: 'La detección y la trayectoria dependen de tags, firmas y grafos; el manual modifica la composición y las notas. La cobertura editorial es el porcentaje de pasos con exposición del manual o apertura usada en el primer paso. No evalúa la corrección filosófica del texto.' };
}
