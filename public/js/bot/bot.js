import { buildGraph, normalizeStep, expandStep, resolveSub, resolvePasajeRef, entrySubOfFaq } from './graph.js';
import { diagnose } from './detect.js';
import { planPath, ENTRY_DEFAULT, DEFAULT_MAX_STEPS } from './plan.js';
import { composeStep, getStepLateralNotes } from './composer.js';
import { getDefinition, formatDefinitionMessage, conceptOfFaq } from './definitions.js';
import { V } from './voice.js';
import { resourcesFor } from './resources.js';
import { normalizeConfig, DIALOGO_CONFIG } from './config.js';
import { startPlayback, playbackNext, playbackOption, noRuleMessage, invalidRuleMessage, curatedOptions } from './modes/dummy.js';

function primaryConceptOf(S, subId) {
  const atomics = expandStep(S, subId);
  for (const id of atomics.length ? atomics : [subId]) {
    const sub = S.SUB?.[id];
    if (sub?.conceptos_clave?.[0]) return sub.conceptos_clave[0];
  }
  return null;
}

export class Bot {
  constructor(S, opts = {}) {
    this.S = S;
    this.G = buildGraph(S);
    this.defaultMaxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS;
    // Política de modos por vía de entrada (faq | texto): ver bot/config.js
    this.config = normalizeConfig(opts.config ?? DIALOGO_CONFIG);
    this.reset();
  }

  reset() {
    this.state = {
      phase: 'idle',
      messages: [],
      goal: null,
      plan: [],
      position: 0,
      visited: [],
      visitedNotes: [],
      stepCount: 0,
      lastUnit: null,
      lastMoment: null,
      pendingPrefix: null,
      pendingFollowUp: null,
      diagnosis: null,
      clarificationChoices: [],
      playback: null,     // trayecto explícito en reproducción (modes/dummy.js)
      modo: null,         // 'dummy' | 'smart' de la consulta en curso
    };
  }

  isContinuation(text) {
    return /^(si|sí|seguir|continua|continuá|continuar|sigue|adelante|dale|ok|gracias)[.!\s]*$/i.test(String(text || '').trim());
  }

  isMidWalk() {
    if (this.state.phase !== 'awaiting') return false;
    if (this.state.pendingFollowUp === 'clarification' || this.state.pendingFollowUp === 'definition-offered') return false;
    return this.state.plan.length > 0 && this.state.position > 0 && this.state.position < this.state.plan.length;
  }

  greet() {
    this.state.phase = 'idle';
    const msg = { role: 'bot', kind: 'greet', text: V.greet };
    this.state.messages.push(msg);
    return msg;
  }

  get modo() {
    return this.state.modo || this.config.politica.texto;
  }

  // opts.via: 'texto' (escrita por el usuario, por defecto) | 'faq' (elegida de la lista).
  // opts.faqId: con via 'faq', la FAQ elegida; no pasa por la detección.
  onUserMessage(text, opts = {}) {
    this.state.messages.push({ role: 'user', text });
    if (opts.via === 'faq' && opts.faqId) {
      if (this.state.phase === 'ended') { this.reset(); this.state.messages.push({ role: 'user', text }); }
      return this.enterFaq(opts.faqId, text);
    }
    if (this.state.phase === 'idle') return this.enter(text);
    if (this.state.phase === 'awaiting') return this.onAwait(text);
    if (this.state.phase === 'ended') {
      this.reset();
      const g = this.greet();
      this.state.messages.push({ role: 'user', text });
      return [g].concat(this.enter(text));
    }
    return [];
  }

  // Entrada por una FAQ elegida explícitamente (lista de FAQ u opción «faq:<id>»).
  enterFaq(faqId, text = null) {
    const faq = this.S.repo.faq(faqId);
    if (!faq) return this.enter(text || faqId);
    return this.enter(text || faq.pregunta, this.faqGoal(faq), { via: 'faq' });
  }

  enter(text, selectedGoal = null, { via = 'texto' } = {}) {
    this.state.modo = this.config.politica[via] || this.config.politica.texto;
    const diagnosis = diagnose(this.S, text);
    this.state.diagnosis = diagnosis;
    if (!selectedGoal && diagnosis.status !== 'safe') return this.offerClarification(diagnosis);

    const goal = selectedGoal || diagnosis.goal;
    this.state.pendingFollowUp = null;
    this.state.clarificationChoices = [];

    this.state.playback = null;
    const targetSub = (goal && goal.targetSub) || ENTRY_DEFAULT;
    this.state.goal = goal;

    // ── 1. Regla explícita: trayecto publicado (o borrador en previsualización) ──
    // Se reproduce tal cual en ambos modos. Si tiene errores, no se muestra.
    const vigente = goal?.type === 'faq'
      ? this.S.repo.trayectoVigente(goal.id, { previewDrafts: this.config.previewDrafts })
      : null;
    if (vigente) {
      if (vigente.errores.length) return [invalidRuleMessage(this, goal, vigente)];
      return startPlayback(this, vigente, goal);
    }

    // ── 2. Regla explícita: respuesta directa escrita en la FAQ ──
    const faq = goal?.type === 'faq' ? this.S.FAQ[goal.id] : null;
    if (faq?.exposicion_directa) return this.directAnswer(goal, faq);

    // ── 3. Sin regla explícita: dummy informa; smart usa el planificador ──
    if (this.modo === 'dummy') return [noRuleMessage(this, goal)];

    let maxSteps = this.defaultMaxSteps;
    if (goal?.type === 'faq') {
      if (faq?.argumento && this.S.argumentos?.argumentos?.[faq.argumento]) {
        maxSteps = Infinity;
      }
    }

    this.state.plan = planPath(this.S, this.G,
      goal ? { ...goal, targetSub } : null, { maxSteps });
    this.state.position = 0;
    this.state.visited = [];
    this.state.visitedNotes = [];
    this.state.stepCount = 0;
    this.state.lastUnit = null;
    this.state.lastMoment = null;

    const defData = this.findDefinitionFor(goal);
    if (defData) {
      const defMsg = formatDefinitionMessage(defData);
      this.state.messages.push(defMsg);
      this.state.phase = 'awaiting';
      this.state.pendingFollowUp = 'definition-offered';
      return [defMsg];
    }

    return this.startWalk();
  }

  directAnswer(goal, faq) {
    this.state.plan = [];
    this.state.position = 0;
    this.state.phase = 'ended';
    const responses = (faq.respuesta || []).filter(r => r.rol === 'responde');
    const msg = { role: 'bot', kind: 'short', text: responses.map(r => r.t).join('\n\n'),
      meta: { titulo: faq.pregunta, ref: responses.map(r => r.ref).filter(Boolean).join('; ') },
      resources: resourcesFor(goal), actions: [{ id: 'restart', label: 'Nueva conversación' }] };
    this.state.messages.push(msg);
    return [msg];
  }

  faqGoal(faq) {
    return { type: 'faq', id: faq.id, label: faq.pregunta,
      targetSub: entrySubOfFaq(this.S, faq.id), faqDefinicion: faq.definicion || null };
  }

  offerClarification(diagnosis) {
    this.state.goal = null;
    this.state.plan = [];
    this.state.position = 0;
    this.state.phase = 'awaiting';
    this.state.pendingFollowUp = 'clarification';
    this.state.clarificationChoices = diagnosis.status === 'weak' && diagnosis.goal
      ? [diagnosis.goal] : diagnosis.choices;
    const dummy = this.modo === 'dummy';
    const options = this.state.clarificationChoices
      .map((goal, i) => ({ goal, id: `clarify:${i}`, label: `Explorar: ${goal.label}` }))
      // En dummy solo se ofrecen FAQ: un concepto suelto no tiene regla explícita.
      .filter(o => !dummy || o.goal.type === 'faq')
      .map(({ id, label }) => ({ id, label }));
    if (dummy) options.push(...curatedOptions(this).filter(o => !options.some(x => x.label === o.label)));
    else options.push({ id: 'clarify:tour', label: 'Hacer un recorrido introductorio' });
    const text = diagnosis.status === 'weak'
      ? `Reconozco «${diagnosis.goal.label}», pero no tengo una FAQ que responda con precisión a esa formulación. Puedo ofrecerte un recorrido por ese concepto; puede no resolver la pregunta específica. También podés reformularla.`
      : diagnosis.status === 'ambiguous'
        ? 'La pregunta admite varias interpretaciones y no encuentro una FAQ que cubra con precisión todos sus conceptos y su intención. Podés reformularla o elegir un concepto para explorar.'
        : 'No encuentro una pregunta o concepto del corpus que corresponda a tu mensaje. Podés reformularlo, elegir una pregunta frecuente o iniciar un recorrido introductorio.';
    const msg = { role: 'bot', kind: 'clarification', text, options };
    this.state.messages.push(msg);
    return [msg];
  }

  startWalk() {
    const goal = this.state.goal;
    const hasApertura = this.firstStepHasApertura();
    this.state.pendingPrefix = hasApertura ? null : (goal ? V.bridge(goal.label) : V.genericBridge);
    this.state.phase = 'awaiting';
    const step = this.step();
    if (step) return [step];
    return [this.closingMessage('done')];
  }

  firstStepHasApertura() {
    if (!this.state.plan.length) return false;
    const firstId = this.state.plan[0];
    if (this.S.manual?.por_subunidad?.[firstId]?.exposicion) return true;
    const conceptId = primaryConceptOf(this.S, firstId);
    if (!conceptId) return false;
    return !!(this.S.manual?.por_concepto?.[conceptId]?.apertura);
  }

  findDefinitionFor(goal) {
    if (!goal) return null;
    let conceptId = null;
    if (goal.type === 'faq') {
      const faq = this.S.FAQ?.[goal.id];
      if (!faq) return null;
      const isDefinitionalFaq = faq.id.endsWith('.definicion')
        || (faq.firmas || []).some(f => f.intent === 'definir' && (f.arguments || []).includes(`func:${faq.arbol?.nodo}`));
      if (isDefinitionalFaq) conceptId = conceptOfFaq(this.S, faq);
    } else if (goal.type === 'concept') {
      if (this.S.DEFC?.[goal.id]?.length) conceptId = goal.id;
    }
    if (!conceptId) return null;
    return getDefinition(this.S, conceptId);
  }

  onAwait(text) {
    if (this.state.pendingFollowUp === 'clarification') return this.enter(text);
    if (this.state.pendingFollowUp === 'no-rule') {
      this.state.pendingFollowUp = null;
      return this.enter(text);
    }
    if (this.state.playback) {
      return this.isContinuation(text) ? [playbackNext(this)] : this.enter(text);
    }

    const diagnosis = diagnose(this.S, text);
    const continuation = this.isContinuation(text);

    if (this.state.pendingFollowUp === 'definition-offered') {
      this.state.pendingFollowUp = null;
      const goal = diagnosis.goal;
      if (goal && (!this.state.goal || goal.id !== this.state.goal.id)) {
        return this.enter(text);
      }
      return this.startWalk();
    }

    this.state.pendingFollowUp = null;

    if (continuation) {
      const step = this.step();
      if (step) return [step];
      return [this.closingMessage('done')];
    }

    return this.enter(text);
  }

  onOption(optionId) {
    if (this.state.phase !== 'awaiting') return [];

    const faqOpt = /^faq:(.+)$/.exec(optionId);
    if (faqOpt) {
      const faq = this.S.repo.faq(faqOpt[1]);
      if (!faq) return [];
      this.state.messages.push({ role: 'user', text: faq.pregunta });
      this.state.pendingFollowUp = null;
      return this.enterFaq(faq.id);
    }

    if (this.state.playback) return playbackOption(this, optionId) || [];

    if (this.state.pendingFollowUp === 'clarification') {
      if (optionId === 'clarify:tour' && this.modo !== 'dummy') {
        this.state.messages.push({ role: 'user', text: 'Hacer un recorrido introductorio' });
        this.state.goal = null;
        this.state.playback = null;
        this.state.plan = planPath(this.S, this.G, null, { maxSteps: this.defaultMaxSteps });
        this.state.position = 0;
        this.state.visited = [];
        this.state.visitedNotes = [];
        this.state.stepCount = 0;
        this.state.lastUnit = null;
        this.state.lastMoment = null;
        this.state.pendingFollowUp = null;
        this.state.clarificationChoices = [];
        return this.startWalk();
      }
      const match = /^clarify:(\d+)$/.exec(optionId);
      const goal = match && this.state.clarificationChoices[Number(match[1])];
      if (!goal) return [];
      this.state.messages.push({ role: 'user', text: `Explorar: ${goal.label}` });
      return this.enter(this.state.diagnosis.raw, goal);
    }

    if (this.state.pendingFollowUp === 'definition-offered') {
      this.state.pendingFollowUp = null;
      const label = optionId === 'profundizar'
        ? 'Ver cómo se construye paso a paso'
        : 'Con eso alcanza, gracias';
      this.state.messages.push({ role: 'user', text: label });
      if (optionId === 'cerrar') return [this.closingMessage('done')];
      if (optionId === 'profundizar') return this.startWalk();
      return [];
    }

    if (this.state.pendingFollowUp === 'lateral-continue') {
      this.state.pendingFollowUp = null;
      if (optionId !== 'seguir') return [];
      this.state.messages.push({ role: 'user', text: 'Continuar el trayecto' });
      return this.advanceStep();
    }

    const currentId = this.state.plan[this.state.position - 1];
    const opt = this.optionsFor(currentId).find(o => o.id === optionId);
    if (!opt) return [];

    this.state.messages.push({ role: 'user', text: opt.label });

    if (opt.kind === 'close') return [this.closingMessage('done')];

    if (opt.kind === 'nota') {
      const noteMsg = this.noteLateralMessage(opt.noteId);
      if (!noteMsg) return [];
      this.state.visitedNotes.push(opt.noteId);
      this.state.pendingFollowUp = 'lateral-continue';
      this.state.messages.push(noteMsg);
      return [noteMsg];
    }

    if (opt.kind === 'explorar') {
      const lateral = this.lateralMessage(opt.to);
      if (!lateral) return [];
      this.state.pendingFollowUp = 'lateral-continue';
      this.state.messages.push(lateral);
      return [lateral];
    }

    if (opt.kind === 'seguir') return this.advanceStep();
    return [];
  }

  advanceStep() {
    const step = this.step();
    if (step) return [step];
    return [this.closingMessage('done')];
  }

  closingMessage(reason) {
    this.state.phase = 'ended';
    const msg = {
      role: 'bot', kind: 'closing',
      text: reason === 'limit' ? V.closing.limit : V.closing.done,
      resources: resourcesFor(this.state.goal),
      actions: [{ id: 'restart', label: 'Nueva conversación' }],
    };
    this.state.messages.push(msg);
    return msg;
  }

  noteLateralMessage(noteId) {
    const note = this.S.manual?.notas_laterales?.[noteId];
    if (!note) return null;
    return {
      role: 'bot',
      kind: 'lateral',
      text: note.texto,
      meta: {
        bekker: note.ref || 'Nota lateral',
        titulo: note.titulo || 'Nota lateral',
        progreso: 'nota',
      },
      options: [{ id: 'seguir', kind: 'seguir', label: 'Continuar el trayecto' }],
    };
  }

  lateralMessage(subId) {
    const sub = this.S.SUB?.[subId];
    if (!sub) return null;
    const subManual = this.S.manual?.por_subunidad?.[subId];
    const body = subManual?.exposicion || sub.intro || sub.titulo;
    if (!body) return null;
    const relatedFaq = this.findRelatedFaqForSub(subId);
    const footer = V.lateralFooter(relatedFaq?.pregunta || null);
    return {
      role: 'bot',
      kind: 'lateral',
      text: body + footer,
      meta: {
        bekker: sub.bekker,
        titulo: `Desvío: ${sub.titulo}`,
        progreso: 'desvío',
      },
      options: [{ id: 'seguir', kind: 'seguir', label: 'Continuar el trayecto' }],
    };
  }

  canShowLateral(subId) {
    const sub = this.S.SUB?.[subId];
    return !!(sub && (sub.intro || sub.titulo));
  }

  findRelatedFaqForSub(subId) {
    const sub = this.S.SUB?.[subId];
    if (!sub) return null;
    const faqs = Object.values(this.S.FAQ || {});
    const resolved = p => resolvePasajeRef(this.S, p.ref);
    for (const faq of faqs) {
      for (const p of faq.pasajes || []) {
        if (p.rol === 'responde' && resolved(p) === subId) return faq;
      }
    }
    const conceptSet = new Set(sub.conceptos_clave || []);
    if (conceptSet.size) {
      for (const faq of faqs) {
        for (const p of faq.pasajes || []) {
          const sid = resolved(p);
          const s = sid && this.S.SUB[sid];
          if (s && (s.conceptos_clave || []).some(c => conceptSet.has(c))) return faq;
        }
      }
    }
    return null;
  }

  step() {
    while (this.state.position < this.state.plan.length) {
      const id = this.state.plan[this.state.position];
      const sub = resolveSub(this.S, id);
      if (!sub) {
        this.state.position++;
        continue;
      }

      const conceptId = primaryConceptOf(this.S, id);
      const prevSubId = this.state.position > 0 ? this.state.plan[this.state.position - 1] : null;
      const prevConceptId = prevSubId ? primaryConceptOf(this.S, prevSubId) : null;

      const body = composeStep(this.S, this.S.manual, conceptId, prevConceptId, sub, { prevSubId })
        || (sub.intro || V.stepFallback(sub.titulo));

      const prefixes = [];
      if (this.state.pendingPrefix) {
        prefixes.push(this.state.pendingPrefix);
        this.state.pendingPrefix = null;
      }
      const unitId = sub.unidad;
      const unit = unitId && this.S.U[unitId]
        ? { id: unitId, titulo: this.S.U[unitId].titulo, resumen: this.S.U[unitId].resumen || '' }
        : null;
      const momEntry = expandStep(this.S, id).map(a => this.S.MOM[a]).find(m => m) || null;
      const moment = momEntry?.m
        ? { id: momEntry.m.id, titulo: momEntry.m.titulo, t: momEntry.m.t || '' }
        : null;
      const prevUnit = this.state.lastUnit;
      const isFirstStep = prevUnit === null;
      const unitChanged = !isFirstStep && unit && unit.id !== prevUnit;
      if (unitChanged && this.S.U[prevUnit]) {
        prefixes.push(V.chapterClose(this.S.U[prevUnit], unit));
      }
      this.state.lastUnit = unit?.id || prevUnit;
      this.state.lastMoment = moment?.id || this.state.lastMoment;

      this.state.visited.push(id);
      this.state.position++;
      this.state.stepCount++;

      const done = this.state.position >= this.state.plan.length;
      const parts = [...prefixes, body];
      if (done) parts.push(V.closing.done);
      const text = parts.filter(Boolean).join('\n\n');
      this.state.phase = done ? 'ended' : 'awaiting';

      const meta = {
        bekker: sub.bekker,
        titulo: sub.titulo,
        momento: moment?.id || null,
        progreso: `${this.state.stepCount}/${this.state.plan.length}`,
        unidad: unit,
        origen: 'generado', // recorrido propuesto por el planificador (modo smart)
      };

      const msg = {
        role: 'bot', kind: 'step', step: id,
        text,
        meta,
        options: done ? [] : this.optionsFor(id),
        resources: done ? resourcesFor(this.state.goal) : [],
        actions: done ? [{ id: 'restart', label: 'Nueva conversación' }] : null,
      };
      this.state.messages.push(msg);
      return msg;
    }
    return null;
  }

  optionsFor(id) {
    const outs = [];
    const next = this.state.plan[this.state.position];
    if (next) {
      const nextSub = resolveSub(this.S, next);
      const n = this.G.nodes.get(next) || nextSub;
      if (n) outs.push({ id: 'seguir', kind: 'seguir', label: `Seguir: ${n.title || n.titulo || next}`, to: next });
    }

    const conceptId = primaryConceptOf(this.S, id);
    const atomics = expandStep(this.S, id);
    const noteIds = new Set();
    const notes = [];
    const collectNotes = (stepId, cId) => {
      for (const nl of getStepLateralNotes(this.S, this.S.manual, stepId, cId)) {
        if (noteIds.has(nl.id)) continue;
        noteIds.add(nl.id);
        notes.push(nl);
      }
    };
    collectNotes(id, conceptId);
    for (const atomicId of atomics) {
      if (atomicId !== id) collectNotes(atomicId, primaryConceptOf(this.S, atomicId));
    }
    const unvisited = notes.filter(nl => !this.state.visitedNotes.includes(nl.id));
    if (unvisited.length) {
      const nl = unvisited[0];
      outs.push({
        id: `nota:${nl.id}`,
        kind: 'nota',
        noteId: nl.id,
        label: `Nota: ${nl.titulo}`,
      });
      return outs;
    }

    const pivotFrom = atomics.length ? atomics : [id];
    const pivots = pivotFrom.flatMap(aid => this.G.adj.get(aid) || [])
      .filter(e => e.rel === 'pivote'
        && this.state.visited.indexOf(e.to) < 0
        && this.state.plan.indexOf(e.to) < 0
        && this.canShowLateral(e.to))
      .sort((a, b) => b.weight - a.weight);
    if (pivots.length && outs.length < 2) {
      const n = this.G.nodes.get(pivots[0].to);
      outs.push({ id: 'explorar', kind: 'explorar', label: `Explorar: ${n.title}`, to: pivots[0].to });
    }

    if (!outs.length) outs.push({ id: 'close', kind: 'close', label: 'Cerrar el recorrido' });
    return outs;
  }

  shortAnswer(goal) {
    if (!goal) return null;
    if (goal.type === 'faq') {
      const faq = this.S.FAQ[goal.id];
      if (!faq) return null;
      const drafts = (faq.respuesta || []).filter(x => x.rol === 'responde');
      if (drafts.length) return drafts.map(d => d.t).join(' ');
      const subId = goal.targetSub;
      const subManual = subId && this.S.manual?.por_subunidad?.[subId];
      if (subManual?.exposicion) return subManual.exposicion;
      const sub = subId && this.S.SUB[subId];
      return sub ? sub.intro : null;
    }
    if (goal.type === 'concept') {
      const manualEntry = this.S.manual?.por_concepto?.[goal.id];
      if (manualEntry?.definicion_corta) return manualEntry.definicion_corta;
      const node = this.S.N?.[goal.id] || this.S.FN?.[goal.id];
      if (node?.def) return node.def;
      if (goal.targetSub && this.S.SUB[goal.targetSub]?.intro) {
        return this.S.SUB[goal.targetSub].intro;
      }
    }
    return null;
  }
}