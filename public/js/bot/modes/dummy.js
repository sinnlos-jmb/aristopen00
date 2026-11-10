// js/bot/modes/dummy.js
// Reproductor de reglas explícitas. Muestra un trayecto exactamente como está
// escrito: sus pasos, en su orden, con su texto. No agrega puentes, no saltea,
// no deduplica y no consulta al planificador. Lo usan ambos modos del bot.

import { composePaso } from '../../content/trayecto.js';
import { V } from '../voice.js';
import { resourcesFor } from '../resources.js';

const RESTART = [{ id: 'restart', label: 'Nueva conversación' }];

export function startPlayback(bot, vigente, goal) {
  bot.state.playback = {
    trayecto: vigente.trayecto,
    origen: vigente.trayecto.estado, // 'publicado' | 'borrador'
    avisos: vigente.avisos,
    index: 0,
    visitedNotes: [],
  };
  bot.state.goal = goal;
  bot.state.plan = vigente.trayecto.pasos.map(p => p.subunidades[0]);
  bot.state.position = 0;
  bot.state.pendingFollowUp = null;
  bot.state.phase = 'awaiting';
  return [playbackNext(bot)];
}

export function playbackNext(bot) {
  const pb = bot.state.playback;
  const { pasos } = pb.trayecto;
  const i = pb.index;
  const paso = pasos[i];
  if (!paso) return closing(bot);
  const last = i === pasos.length - 1;
  pb.index++;
  bot.state.position = pb.index;
  bot.state.phase = last ? 'ended' : 'awaiting';

  const msg = {
    role: 'bot', kind: 'step', step: paso.subunidades[0],
    text: [composePaso(paso), last ? V.closing.done : ''].filter(Boolean).join('\n\n'),
    meta: {
      bekker: paso.bekker, titulo: paso.titulo, momento: null, unidad: null,
      progreso: `${i + 1}/${pasos.length}`,
      origen: pb.origen, trayecto: pb.trayecto.id, paso: paso.id,
    },
    options: last ? [] : optionsFor(bot, paso, pasos[i + 1]),
    resources: last ? resourcesFor(bot.state.goal) : [],
    actions: last ? RESTART : null,
  };
  bot.state.messages.push(msg);
  return msg;
}

function optionsFor(bot, paso, next) {
  const outs = [{ id: 'seguir', kind: 'seguir', label: `Seguir: ${next.titulo}` }];
  const notes = bot.S.manual?.notas_laterales || {};
  for (const nid of paso.notas_laterales) {
    if (notes[nid] && !bot.state.playback.visitedNotes.includes(nid)) {
      outs.push({ id: `nota:${nid}`, kind: 'nota', noteId: nid, label: `Nota: ${notes[nid].titulo || nid}` });
    }
  }
  return outs;
}

// Devuelve los mensajes de respuesta o null si la opción no pertenece al reproductor.
export function playbackOption(bot, optionId) {
  const pb = bot.state.playback;
  if (optionId === 'seguir') {
    bot.state.messages.push({ role: 'user', text: 'Seguir' });
    return [playbackNext(bot)];
  }
  if (optionId === 'close') {
    bot.state.messages.push({ role: 'user', text: 'Cerrar el recorrido' });
    return [closing(bot)];
  }
  const m = /^nota:(.+)$/.exec(optionId);
  const note = m && bot.S.manual?.notas_laterales?.[m[1]];
  if (!note) return null;
  pb.visitedNotes.push(m[1]);
  bot.state.messages.push({ role: 'user', text: `Nota: ${note.titulo || m[1]}` });
  const next = pb.trayecto.pasos[pb.index];
  const msg = {
    role: 'bot', kind: 'lateral', text: note.texto,
    meta: { bekker: note.ref || 'Nota lateral', titulo: note.titulo || 'Nota lateral', progreso: 'nota', origen: pb.origen },
    options: next ? [{ id: 'seguir', kind: 'seguir', label: `Seguir: ${next.titulo}` }] : [{ id: 'close', kind: 'close', label: 'Cerrar el recorrido' }],
  };
  bot.state.messages.push(msg);
  return [msg];
}

function closing(bot) {
  bot.state.phase = 'ended';
  const msg = { role: 'bot', kind: 'closing', text: V.closing.done,
    resources: resourcesFor(bot.state.goal), actions: RESTART };
  bot.state.messages.push(msg);
  return msg;
}

// Opciones para iniciar las FAQ que sí tienen regla explícita.
export function curatedOptions(bot, exceptId = null) {
  return bot.S.repo.trayectosPublicados()
    .map(t => bot.S.repo.faq(t.faq))
    .filter(f => f && f.id !== exceptId)
    .map(f => ({ id: `faq:${f.id}`, kind: 'faq', label: f.pregunta }));
}

// Modo dummy sin regla explícita: se informa y no se improvisa.
export function noRuleMessage(bot, goal) {
  const label = goal?.label;
  const options = curatedOptions(bot, goal?.id);
  bot.state.phase = 'awaiting';
  bot.state.pendingFollowUp = 'no-rule';
  const msg = {
    role: 'bot', kind: 'no-rule',
    text: [
      label ? `Todavía no tengo un recorrido preparado para «${label}».` : 'Todavía no tengo un recorrido preparado para esa consulta.',
      options.length ? 'Por ahora puedo acompañarte en estas preguntas:' : 'Podés probar con otra pregunta.',
    ].join(' '),
    meta: { origen: 'sin-regla', faq: goal?.id || null },
    options,
  };
  bot.state.messages.push(msg);
  return msg;
}

// Trayecto con errores: no se reproduce ni se corrige en silencio.
export function invalidRuleMessage(bot, goal, vigente) {
  bot.state.phase = 'ended';
  const msg = {
    role: 'bot', kind: 'invalid-rule',
    text: `El recorrido preparado para «${goal?.label || goal?.id}» tiene errores y no se puede mostrar todavía.`,
    meta: { origen: vigente.trayecto.estado, trayecto: vigente.trayecto.id, errores: vigente.errores },
    actions: RESTART,
  };
  bot.state.messages.push(msg);
  return msg;
}
