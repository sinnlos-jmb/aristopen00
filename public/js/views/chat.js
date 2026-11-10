import { esc } from '../ui.js';
import { V } from '../bot/voice.js';
import { createPassageModal, citationHTML } from '../reader/modal.js';
import { createGraphModal } from '../graphs/modal.js';
// Velocidad del streaming en ms POR PALABRA (los espacios ya no suman pausa).
// Ajustar acá para acelerar/ralentizar globalmente.
const STREAM_SPEED = {
greet: 30,
bridge: 24,
step: 24,
detour: 24,
short: 20,
lateral: 20,
closing: 28,
definition: 24,
default: 24,
};
export function createChatView(App) {
const bot = App.getBot();
const passageModal = createPassageModal(App);
const graphModal = createGraphModal();
const el = document.createElement('div');
el.className = 'view-chat';
el.innerHTML = `
<section class="chat">
<header class="chat__header">
<div class="chat__avatar">Α</div>
<div class="chat__id">
<h1 class="chat__name">Aristóteles</h1>
<p class="chat__sub">Diálogo introductorio · nivel básico</p>
</div>
</header>
<div class="chat__messages" id="messages" role="log" aria-live="polite"></div>
<button type="button" class="chat__follow" id="follow-btn" hidden>↓ Seguir la respuesta</button>
<form class="chat__form" id="form" autocomplete="off">
<input class="chat__input" id="input" type="text"
placeholder="Escribí tu pregunta…" aria-label="Mensaje" />
<button type="button" class="chat__faq" id="faq-btn"
aria-label="Preguntas frecuentes" title="Preguntas frecuentes">?</button>
<button class="chat__send" type="submit" aria-label="Enviar">→</button>
</form>
</section>
<dialog id="faq-modal" aria-labelledby="faq-modal-title">
  <div class="modal-head">
    <h3 id="faq-modal-title">Preguntas frecuentes</h3>
    <button type="button" id="faq-close" aria-label="Cerrar">×</button>
  </div>
  <div class="modal-body" id="faq-body"></div>
</dialog>
`;
const messagesEl = el.querySelector('#messages');
const form = el.querySelector('#form');
const input = el.querySelector('#input');
const faqBtn = el.querySelector('#faq-btn');
const followBtn = el.querySelector('#follow-btn');
let busy = false;
let destroyed = false;
let cancelPendingConfirmation = null;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmtBk = bk => Array.isArray(bk) ? bk.filter(Boolean).join('–') : (bk || '');
// — Scroll pegajoso ---------------------------------------------------------
// El usuario puede releer mensajes anteriores o abrir citas mientras el bot
// escribe: el auto-scroll solo lo sigue si ya está pegado al final. Si se
// aleja, aparece el botón «Seguir la respuesta» para retomar el flujo.
const NEAR_BOTTOM = 80;
const isNearBottom = () =>
messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <= NEAR_BOTTOM;
let followLive = true;
function scrollBottom() {
if (followLive) messagesEl.scrollTop = messagesEl.scrollHeight;
followBtn.hidden = followLive;
}
function setFollow(on) {
followLive = on;
followBtn.hidden = on;
if (on) messagesEl.scrollTop = messagesEl.scrollHeight;
}
messagesEl.addEventListener('scroll', () => {
if (followLive) {
// El usuario (o el navegador) movió el scroll lejos del final: soltar el seguimiento.
if (!isNearBottom()) { followLive = false; followBtn.hidden = false; }
} else if (isNearBottom()) {
// Volvió al final manualmente: retomar el seguimiento.
followLive = true; followBtn.hidden = true;
}
});
followBtn.addEventListener('click', () => setFollow(true));
function streamSpeed(msg) {
if (reducedMotion()) return 0;
return STREAM_SPEED[msg.kind] || STREAM_SPEED.default;
}
async function streamInto(node, text, delayPerWord) {
if (!node) return;
if (!delayPerWord || !text) { node.textContent = text || ''; return; }
node.textContent = text;
const reservedHeight = node.offsetHeight;
node.textContent = '';
node.style.minHeight = reservedHeight + 'px';
try {
const words = text.split(/(\s+)/);
for (let i = 0; i < words.length; i++) {
if (destroyed) return;
node.textContent += words[i];
// Pausa solo tras una palabra real (los espacios no agregan espera).
if (i < words.length - 1 && /\S/.test(words[i])) {
await new Promise(r => setTimeout(r, delayPerWord));
scrollBottom();
}
}
} finally {
node.style.minHeight = '';
}
}
function buildShell(msg) {
const li = document.createElement('div');
li.className = 'msg msg--' + msg.role + (msg.kind ? ' msg--' + msg.kind : '');
if (msg.role === 'bot' && msg.kind === 'definition') {
const etapasTotal = msg.etapas ? msg.etapas.intro.length + msg.etapas.avanzadas.length : 0;
li.innerHTML = `
<div class="msg__avatar">Α</div>
<div class="msg__body">
<div class="msg__meta">Definición · ${esc(msg.meta?.titulo || '')}</div>
<div class="msg__text"></div>
${msg.meta?.ref ? `<div class="msg__def-ref">${citationHTML(msg.meta.ref)}</div>` : ''}
${msg.meta?.nota ? `<div class="msg__def-note">${citationHTML(msg.meta.nota)}</div>` : ''}
${etapasTotal > 0 ? `<details class="msg__def-etapas">
<summary>${etapasTotal} ${etapasTotal === 1 ? 'etapa' : 'etapas'} de la definición</summary>
<ol>${[...msg.etapas.intro, ...msg.etapas.avanzadas].map(e =>
`<li><b>${esc(e.label)}</b> <span class="sub small">${citationHTML(e.ref)}</span>${e.nivel === 'avanzado' ? ' <span class="traj-focus traj-focus--fn">avanzado</span>' : ''}<br>${citationHTML(e.t)}</li>`
).join('')}</ol>
</details>` : ''}
</div>`;
} else if (msg.role === 'bot') {
li.innerHTML = `
<div class="msg__avatar">Α</div>
<div class="msg__body">
${msg.meta ? `<div class="msg__meta">${msg.step ? `<button type="button" class="citation-link" data-citation="${esc(msg.step)}" aria-label="Leer pasaje ${esc(msg.step)}">${esc(fmtBk(msg.meta.bekker))}</button>` : citationHTML(fmtBk(msg.meta.bekker) || msg.meta.ref)} · ${esc(msg.meta.titulo)} <span class="msg__prog">${esc(msg.meta.progreso)}</span></div>` : ''}
<div class="msg__text"></div>
</div>`;
} else {
li.innerHTML = `<div class="msg__body"><div class="msg__text">${esc(msg.text || '')}</div></div>`;
}
return li;
}
function clearPreviousOptions() {
messagesEl.querySelectorAll('.msg__options').forEach(el => el.remove());
}
function appendInteractive(msg) {
if (msg.options?.length) {
clearPreviousOptions();
const wrap = document.createElement('div');
wrap.className = 'msg__options';
wrap.innerHTML = msg.options.map(o =>
`<button type="button" class="opt" data-option="${esc(o.id)}">${esc(o.label)}</button>`
).join('');
messagesEl.appendChild(wrap);
}
if (msg.actions?.length) {
const wrap = document.createElement('div');
wrap.className = 'msg__actions';
wrap.innerHTML = msg.actions.map(a =>
`<button type="button" class="opt opt--action" data-action="${esc(a.id)}">${esc(a.label)}</button>`
).join('');
messagesEl.appendChild(wrap);
}
}
async function appendMessage(msg, { instant = false, showInteractive = true } = {}) {
const li = buildShell(msg);
messagesEl.appendChild(li);
scrollBottom();
if (msg.role === 'bot' && msg.text) {
const textEl = li.querySelector('.msg__text');
const speed = instant ? 0 : streamSpeed(msg);
await streamInto(textEl, msg.text, speed);
if (!destroyed) textEl.innerHTML = citationHTML(msg.text);
}
if (msg.role === 'bot' && msg.resources?.length && !destroyed) {
const resources = document.createElement('section');
resources.className = 'msg__resources';
resources.setAttribute('aria-label', 'Recursos para profundizar');
resources.innerHTML = `<p>Para ampliar esta explicación, te sugiero revisar el grafo y volver al texto:</p><ul>${msg.resources.map(r =>
`<li>${r.kind === 'graph'
? `<a href="${esc(r.url)}" data-graph="${esc(r.id)}" aria-haspopup="dialog">Ver grafo: ${esc(r.label)}</a>`
: `<button type="button" class="citation-link" data-citation="${esc(r.reference)}">${esc(r.label)}</button>`}</li>`
).join('')}</ul>`;
li.querySelector('.msg__body').appendChild(resources);
}
if (showInteractive && !destroyed) {
appendInteractive(msg);
}
scrollBottom();
}
async function run(replies) {
if (!replies?.length) return;
busy = true;
el.classList.add('is-busy');
for (const m of replies) {
if (destroyed) break;
await appendMessage(m);
if (!reducedMotion()) {
await new Promise(r => setTimeout(r, 160));
}
}
busy = false;
el.classList.remove('is-busy');
if (destroyed) return;
// No robar el foco si el usuario está leyendo otra cosa: modal abierto,
// selección de texto o foco dentro del contenedor de mensajes.
const reading = !followLive
|| messagesEl.contains(document.activeElement)
|| !!(window.getSelection && String(window.getSelection()));
if (!document.querySelector('.reader-modal[open], .graph-modal[open]') && !reading) input.focus();
}
async function renderExisting() {
const msgs = bot.state.messages;
for (let i = 0; i < msgs.length; i++) {
const isLast = i === msgs.length - 1;
await appendMessage(msgs[i], { instant: true, showInteractive: isLast });
}
}
// — Modal de confirmación de interrupción del recorrido ---------------------
function confirmInterruption() {
return new Promise(resolve => {
const dlg = document.createElement('dialog');
dlg.className = 'confirm-modal';
dlg.setAttribute('aria-labelledby', 'confirm-interrupt-title');
dlg.innerHTML = `
<div class="modal-head"><h3 id="confirm-interrupt-title">Interrumpir el recorrido</h3></div>
<div class="modal-body">
<p>Estás en medio de un recorrido. Si seguís, se interrumpe y, para retomarlo, vas a tener que empezarlo de nuevo.</p>
<div class="confirm-actions">
<button type="button" class="opt opt--action" data-yes>Sí, interrumpir</button>
<button type="button" class="opt" data-no>Volver al recorrido</button>
</div>
</div>`;
document.body.appendChild(dlg);
let settled = false;
const finish = (val) => {
  if (settled) return;
  settled = true;
  if (cancelPendingConfirmation === cancel) cancelPendingConfirmation = null;
  dlg.remove();
  resolve(val);
};
const cancel = () => finish(false);
cancelPendingConfirmation = cancel;
dlg.querySelector('[data-yes]').addEventListener('click', () => finish(true));
dlg.querySelector('[data-no]').addEventListener('click', () => finish(false));
dlg.addEventListener('cancel', e => { e.preventDefault(); finish(false); });
dlg.addEventListener('click', e => { if (e.target === dlg) finish(false); });
if (typeof dlg.showModal === 'function') dlg.showModal();
else dlg.setAttribute('open', '');
dlg.querySelector('[data-no]').focus();
});
}
(async () => {
if (document.fonts?.ready) {
try { await document.fonts.ready; } catch (_) {}
}
if (destroyed) return;
if (!bot.state.messages.length) {
const g = bot.greet();
await appendMessage(g);
} else {
await renderExisting();
}
})();
let pickedFaq = null; // { id, q } de la última FAQ elegida en la lista
form.addEventListener('submit', async (e) => {
e.preventDefault();
if (busy) return;
const text = input.value.trim();
if (!text) return;
// Si hay un recorrido activo y el texto no es una continuación, avisar que
// se interrumpe antes de procesar.
if (bot.isMidWalk() && !bot.isContinuation(text)) {
const ok = await confirmInterruption();
if (!ok || destroyed) return; // El usuario decide seguir o abandonó la vista.
}
input.value = '';
clearPreviousOptions();
setFollow(true); // el usuario pregunta: quiere ver la respuesta al final
await appendMessage({ role: 'user', text });
const via = pickedFaq && pickedFaq.q === text ? { via: 'faq', faqId: pickedFaq.id } : { via: 'texto' };
pickedFaq = null;
const replies = bot.onUserMessage(text, via);
await run(replies);
});
messagesEl.addEventListener('click', async (e) => {
const graph = e.target.closest('[data-graph]');
if (graph) { e.preventDefault(); graphModal.open(graph.dataset.graph, graph); return; }
const citation = e.target.closest('[data-citation]');
if (citation) { await passageModal.open(citation.dataset.citation, citation); return; }
if (busy) return;
const opt = e.target.closest('[data-option]');
if (opt) {
const optionId = opt.dataset.option;
const label = opt.textContent;
clearPreviousOptions();
setFollow(true); // el usuario elige una opción: quiere ver la continuación
await appendMessage({ role: 'user', text: label });
const replies = bot.onOption(optionId);
await run(replies);
return;
}
const act = e.target.closest('[data-action="restart"]');
if (act) {
bot.reset();
messagesEl.innerHTML = '';
setFollow(true);
const g = bot.greet();
await appendMessage(g);
input.focus();
}
});
// Modal FAQ
const modal = el.querySelector('#faq-modal');
const faqBody = el.querySelector('#faq-body');
const faqClose = el.querySelector('#faq-close');
function questions() {
const list = (App.S?.repo.faqs() || []).filter(f => f.pregunta).map(f => ({ id: f.id, q: f.pregunta }));
return list.length ? list : V.fallbackQuestions.map(q => ({ id: '', q }));
}
function openFaq() {
if (destroyed) return;
faqBody.innerHTML = questions().map(({ id, q }) =>
`<button type="button" class="faq-item" data-q="${esc(q)}" data-faq="${esc(id)}">${esc(q)}</button>`
).join('');
if (typeof modal.showModal === 'function') modal.showModal();
else modal.setAttribute('open', '');
}
function closeFaq() {
if (typeof modal.close === 'function') modal.close();
else modal.removeAttribute('open');
}
function onModalBackdrop(e) {
if (e.target === modal) closeFaq();
}
function onFaqPick(e) {
const item = e.target.closest('[data-q]');
if (!item) return;
closeFaq();
input.value = item.dataset.q;
// Si se envía sin modificar, la consulta llega como FAQ elegida (modo dummy).
pickedFaq = item.dataset.faq ? { id: item.dataset.faq, q: item.dataset.q } : null;
input.focus();
}
faqBtn.addEventListener('click', openFaq);
faqClose.addEventListener('click', closeFaq);
modal.addEventListener('click', onModalBackdrop);
faqBody.addEventListener('click', onFaqPick);
input.focus();
return {
el,
destroy() {
destroyed = true;
cancelPendingConfirmation?.();
passageModal.destroy();
graphModal.destroy();
faqClose.removeEventListener('click', closeFaq);
modal.removeEventListener('click', onModalBackdrop);
faqBody.removeEventListener('click', onFaqPick);
},
};
}