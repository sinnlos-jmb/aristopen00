// js/lab/trayectos.js
// Modelo de "trayectos" curados por FAQ. Un trayecto es una versión editable
// del recorrido: pasos (nodos con contenido) y aristas (transiciones).
// Se guarda en sessionStorage durante la sesión y se exporta a JSON.

import { readSession, writeSession } from './session.js';

const KEY = 'trayectos';

export function getAllTrayectos() {
return readSession(KEY, {});
}

export function getTrayectos(faqId) {
return getAllTrayectos()[faqId] || [];
}

export function saveTrayecto(faqId, trayecto) {
const all = getAllTrayectos();
const list = all[faqId] || [];
const idx = list.findIndex(t => t.id === trayecto.id);
if (idx >= 0) list[idx] = trayecto; else list.push(trayecto);
all[faqId] = list;
writeSession(KEY, all);
return list;
}

export function deleteTrayecto(faqId, trayectoId) {
const all = getAllTrayectos();
all[faqId] = (all[faqId] || []).filter(t => t.id !== trayectoId);
writeSession(KEY, all);
return all[faqId];
}

export function setActiveTrayecto(faqId, trayectoId) {
const all = getAllTrayectos();
const list = all[faqId] || [];
for (const t of list) t.activo = (t.id === trayectoId);
all[faqId] = list;
writeSession(KEY, all);
return list;
}

export function newTrayectoId(faqId) {
const list = getTrayectos(faqId);
let n = list.length + 1;
let id = `trayecto.${faqId}.${n}`;
while (list.some(t => t.id === id)) { n++; id = `trayecto.${faqId}.${n}`; }
return id;
}

// Genera un trayecto editable a partir de una trayectoria calculada + el manual activo.
export function buildTrayectoFromTrajectory(S, traj, faq) {
const manual = S.manual || {};
const path = traj?.path || [];
const pasos = [];
const seen = new Set();
for (const nodeId of path) {
if (nodeId === 'phusis' || nodeId === 'theion') continue;
const nu = S.NODE_UNIT?.[nodeId];
const sub = nu ? S.SUB[nu.sub] : null;
if (!sub || seen.has(sub.id)) continue;
seen.add(sub.id);
const sm = manual.por_subunidad?.[sub.id] || {};
pasos.push({
nodo: nodeId,
sub: sub.id,
titulo: sub.titulo || nodeId,
bekker: sub.bekker || [],
exposicion: sm.exposicion || sub.intro || '',
ejemplo: sm.ejemplo || '',
cita: sm.cita || '',
notas_laterales: sm.notas_laterales || [],
});
}
const aristas = [];
for (let i = 0; i < pasos.length - 1; i++) {
const de = pasos[i], a = pasos[i + 1];
aristas.push({
de: de.sub,
a: a.sub,
titulo: `Seguir: ${a.titulo}`,
transicion: manual.por_arista?.[`${de.sub}--${a.sub}`]?.transicion || '',
});
}
return {
id: newTrayectoId(faq.id),
faq: faq.id,
titulo: faq.pregunta || faq.id,
dificultad: 'intro',
fecha: new Date().toISOString().slice(0, 10),
activo: true,
pasos,
aristas,
};
}

// Compone el texto de un paso tal como lo vería el usuario en el chat:
// transición entrante + exposición + ejemplo + cita.
export function composeTrayectoStep(trayecto, index) {
const paso = trayecto.pasos?.[index];
if (!paso) return '';
const arista = trayecto.aristas?.[index - 1] || null; // arista que llega al paso index
const parts = [];
if (arista?.transicion) parts.push(arista.transicion);
if (paso.exposicion) parts.push(paso.exposicion);
if (paso.ejemplo) parts.push(paso.ejemplo);
if (paso.cita) parts.push(`«${paso.cita}»`);
return parts.filter(Boolean).join('\n').trim();
}