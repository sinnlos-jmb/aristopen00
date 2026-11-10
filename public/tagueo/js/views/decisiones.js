import { esc } from '../ui.js';
import { href } from '../router.js';
// Para profundizar (D20): reserva de temas para herramientas futuras; no se muestra como nota.
const pp = S => {
  const L = S.tags.para_profundizar || [];
  if (!L.length) return '';
  return `<div class="ph mt6" id="para-profundizar"><h3>Para profundizar</h3><span class="sub">${L.length} temas reservados para grafos, bibliografía y herramientas futuras · no se muestran como notas</span></div>` +
    L.map(x => `<div class="deci"><b>${esc(x.tema)}</b> <span class="sub small">· ${esc(x.ref)}</span><p>${esc(x.t)}</p>${(x.donde || []).length ? `<div class="sub small mt6">Dónde: ${x.donde.map(id => S.SUB[id] ? `<a class="lk" href="${href('unidad', [S.SUB[id].unidad, id])}">${esc(S.SUB[id].bekker.join('–'))}</a>` : esc(id)).join(' · ')}</div>` : ''}</div>`).join('');
};
export function render(S) {
  const h = `<div class="ph"><h2>Decisiones</h2><span class="sub">${S.tags.decisiones.length} decisiones · texto de referencia: ${esc(S.tags.texto_base)}</span></div>` +
    S.tags.decisiones.map(d => `<div class="deci${d.estado === 'reemplazado' ? ' dimd' : ''}"><b>${d.id}</b> · <span class="pill ${{acordado: 'confirmado', reemplazado: 'corchete'}[d.estado] || 'discusion'}">${{acordado: 'Acordado', reemplazado: 'Reemplazado'}[d.estado] || 'En discusión'}</span><p>${esc(d.texto)}</p></div>`).join('') + pp(S);
  return {html: h, title: 'Decisiones'};
}
