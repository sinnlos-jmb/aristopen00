// N1-U.11 · FAQ = composición de fichas/subfichas; subficha = adaptación de ficha base.
// Se trata de una proyección editorial solo-lectura. Las identidades canónicas de MariaDB no cambian.
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[c]);
const fail = msg => { throw new Error(`Catálogo explicativo N1-U.11: ${msg}`); };
const has = x => typeof x === 'string' && x.trim().length > 0;

export function construirCatalogoExplicativo(modelo, fichas, puentes, recurso) {
  if (recurso?.schema !== 'agora.lab.n1u11.catalogo-explicativo.v1' || recurso.estado !== 'borrador_editorial_para_curaduria') fail('esquema/estado no esperado');
  if (!modelo?.revision || modelo.revision !== fichas?.revision || fichas.revision !== puentes?.revision || recurso.fuente?.revision !== modelo.revision) fail('revisión editorial distinta');
  if (recurso.fichas?.length !== fichas.fichas.length || !Array.isArray(recurso.subfichas) || !Array.isArray(recurso.faqs)) fail('cantidades de fichas y FAQ incompletas');
  const base = new Map(), sub = new Map(), faq = new Map(), faqPorFicha = new Map();
  for (const ficha of recurso.fichas) {
    if (!has(ficha?.id) || ficha.tipo !== 'base' || !has(ficha.titulo) || base.has(ficha.id) || fichas.porId.get(ficha.id)?.titulo !== ficha.titulo) fail('ficha base sin respaldo o duplicada');
    base.set(ficha.id, Object.freeze(ficha));
  }
  if (base.size !== fichas.porId.size) fail('alguna ficha base no está representada');
  for (const item of recurso.subfichas) {
    const padre = base.get(item?.ficha_base_id), puente = puentes.porFicha.get(item?.ficha_base_id);
    if (!has(item?.id) || sub.has(item.id) || base.has(item.id) || item.tipo !== 'subficha' || !padre ||
      !has(item.faq_id) || !has(item.titulo) || !has(item.foco) || !has(item.adaptacion) ||
      item.estado !== 'borrador_editorial' || !Array.isArray(item.pasajes) || !item.pasajes.length ||
      new Set(item.pasajes).size !== item.pasajes.length || !item.pasajes.every(id => puente?.apoyos.some(a => a.sub_id === id) && modelo.subs.has(id))) fail(`subficha sin origen o evidencia permitida: ${item?.id}`);
    sub.set(item.id, Object.freeze(item));
  }
  for (const item of recurso.faqs) {
    if (!has(item?.id) || faq.has(item.id) || !has(item.titulo) || !base.has(item.ficha_principal) ||
      !Array.isArray(item.componentes) || !item.componentes.length || item.componentes[0]?.id !== item.ficha_principal ||
      item.componentes[0]?.tipo !== 'ficha') fail('FAQ sin ficha principal válida');
    const usados = new Set();
    for (const componente of item.componentes) {
      if (!['ficha','subficha'].includes(componente?.tipo) || !has(componente.id) || !has(componente.rol) || usados.has(componente.id)) fail(`composición inválida: ${item.id}`);
      if (componente.tipo === 'ficha' && !base.has(componente.id)) fail(`ficha enlazada inexistente: ${componente.id}`);
      if (componente.tipo === 'subficha' && sub.get(componente.id)?.faq_id !== item.id) fail(`subficha no pertenece a esta FAQ: ${item.id}`);
      usados.add(componente.id);
    }
    if (faqPorFicha.has(item.ficha_principal)) fail('una ficha principal no puede ser el inicio de dos FAQ piloto');
    faqPorFicha.set(item.ficha_principal,item); faq.set(item.id,Object.freeze(item));
  }
  if (faq.size !== base.size || [...sub.values()].some(s => !faq.get(s.faq_id)?.componentes.some(c => c.tipo === 'subficha' && c.id === s.id))) fail('FAQ o subficha huérfana');
  return Object.freeze({ revision:modelo.revision, base, sub, faq, faqPorFicha });
}

export function composicionFaqHtml(catalogo, fichaId) {
  const pregunta = catalogo?.faqPorFicha.get(fichaId);
  if (!pregunta) return '';
  return `<details class="arch-remisiones arch-composicion-faq"><summary>FAQ · Fichas y subfichas (${pregunta.componentes.length})</summary>
    <p class="arch-muted">${safe(pregunta.titulo)} · Composición pedagógica en revisión. La ficha base permanece independiente de sus adaptaciones.</p>
    <div class="arch-nav-list">${pregunta.componentes.map(c => {
      const sub = c.tipo === 'subficha' ? catalogo.sub.get(c.id) : null;
      const base = sub ? catalogo.base.get(sub.ficha_base_id) : catalogo.base.get(c.id);
      return `<div class="arch-composicion-item"><strong>${safe(sub ? 'Subficha dependiente' : 'Ficha base')}: ${safe(sub?.titulo || base?.titulo)}</strong>
        <p class="arch-muted">${safe(c.rol)}</p>${sub ? `<p><strong>Adaptación:</strong> ${safe(sub.adaptacion)}</p><p><strong>Foco:</strong> ${safe(sub.foco)}</p>
          <p class="arch-muted">Hereda su identidad editorial de «${safe(base.titulo)}». Pasajes seleccionados: ${sub.pasajes.map(safe).join(' · ')}</p>` : ''}
        <button type="button" class="arch-minor" data-arch-card="${safe(base.id)}">${sub ? 'Ver ficha de origen' : 'Abrir ficha'}</button>
      </div>`;
    }).join('')}</div><p class="arch-muted">Esta FAQ agrupa explicaciones; la secuencia de pasos y los datos publicados en MariaDB no se modifican.</p></details>`;
}
