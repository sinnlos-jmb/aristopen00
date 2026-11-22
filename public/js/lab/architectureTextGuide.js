// N1-U.10 · Lectura guiada de borradores editoriales vinculada a nodos reales.
// No deduce relaciones filosóficas ni fabrica aristas nuevas.
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

export function guiaExplicativaHtml(ficha, capas, seleccion = {}) {
  if (!ficha) return '';
  if (ficha.tipo === 'faq') {
    const pasos = ficha.pasos || [];
    const activo = pasos.find(p => p.id === seleccion.pasoId) || pasos[0];
    if (!activo) return '';
    const puente = seleccion.puente;
    const pasaje = puente?.apoyos?.find(a => a.paso_id === activo.id && a.sub_id === activo.sub_id);
    return `<section class="arch-guide" aria-label="Lectura guiada de la ficha">
      <div class="arch-guide-head"><strong>Texto y grafo · ${pasos.length} pasos</strong><small>Explicación editorial en revisión</small></div>
      <div class="arch-guide-steps" role="group" aria-label="Seleccionar paso desde el texto">${pasos.map((p,i) =>
        `<button type="button" data-arch-guide-step="${safe(p.id)}" aria-pressed="${p.id === activo.id}">${i+1}</button>`).join('')}</div>
      <strong class="arch-guide-label">${safe(activo.titulo)}</strong>
      <p>${safe(activo.comentario)}</p>
      <div class="arch-guide-actions">
        ${pasaje ? `<button type="button" data-arch-guide-support="${safe(activo.sub_id)}">Ubicar pasaje en grafo</button>` : ''}
        ${seleccion.unidadId && puente?.contextos.unidades.some(u => u.id === seleccion.unidadId)
          ? `<button type="button" data-arch-guide-unit="${safe(seleccion.unidadId)}">Ver contexto estructural</button>` : ''}
        <button type="button" data-arch-read="${safe(activo.sub_id)}">Leer griego y castellano</button>
      </div>
      <p class="arch-guide-note">El paso remite a un pasaje seleccionado editorialmente. Su secuencia no equivale a una deducción demostrada.</p>
    </section>`;
  }
  if (ficha.id === 'proemio' && capas?.modulos?.length) {
    const actual = capas.porId.get(seleccion.moduloId) || capas.modulos[0];
    return `<section class="arch-guide" aria-label="Lectura guiada del Proemio">
      <div class="arch-guide-head"><strong>Texto y módulos del Proemio</strong><small>Articulación propuesta</small></div>
      <div class="arch-guide-steps" role="group" aria-label="Seleccionar módulo">${capas.modulos.map((m,i) =>
        `<button type="button" data-arch-guide-module="${safe(m.id)}" aria-pressed="${m.id===actual.id}">${i+1}</button>`).join('')}</div>
      <strong class="arch-guide-label">${safe(actual.titulo)}</strong><p>${safe(actual.funcion)}</p>
      <p class="arch-guide-note">Los módulos sintetizan subunidades documentadas. Sus aristas siguen siendo hipótesis editoriales.</p>
    </section>`;
  }
  return '';
}
