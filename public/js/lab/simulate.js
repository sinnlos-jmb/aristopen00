import { Bot } from '../bot/bot.js';
import { LAB_CONFIG } from '../bot/config.js';

// Una instancia aislada ejecuta los mismos métodos que Diálogo, siempre en modo smart.
export function simulate(S, text) {
  const bot = new Bot(S, { config: LAB_CONFIG });
  const initial = bot.onUserMessage(text);
  const diagnosis = bot.state.diagnosis;
  const plan = bot.state.plan.map(id => ({ id, titulo: S.SUB[id]?.titulo || id }));
  const definition = initial.find(m => m.kind === 'definition') || null;
  const messages = [...initial];
  // Para FAQs de exposición directa, el bot ya terminó (phase 'ended'); el while no se ejecuta.
  // Para conceptos con definición, se simula "profundizar" y luego se sigue el plan.
  if (definition) messages.push(...bot.onOption('profundizar'));
  let truncated = false;
  while (bot.state.phase === 'awaiting' && bot.state.pendingFollowUp !== 'clarification') {
    const last = messages[messages.length - 1];
    const next = last?.options?.find(o => o.id === 'seguir');
    // lab-B6 (Fase C): no cortar en silencio — marcar el resultado como truncado
    // para que tests/snapshots distingan trayectos completos de interrumpidos.
    if (!next) { truncated = true; break; }
    messages.push(...bot.onOption(next.id));
  }
  return { diagnosis, goal: bot.state.goal, plan, definition, initial, messages, truncated };
}
