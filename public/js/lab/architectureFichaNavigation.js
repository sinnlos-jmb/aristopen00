// N1-U.9 · Navegación entre fichas por relaciones editoriales explícitas.
// No crea aristas, no usa tagueo y no toca FAQ ni trayectos en MariaDB.
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[c]);

export function conexionesDeFicha(fichas, red, fichaId) {
  if (!fichas?.porId?.has(fichaId) || !red?.relaciones || fichas.revision !== red.revision) return [];
  return red.relaciones.filter(r => r.desde === fichaId || r.hacia === fichaId).map(r => {
    const sale = r.desde === fichaId;
    const otroId = sale ? r.hacia : r.desde;
    const otro = fichas.porId.get(otroId);
    if (!otro || !red.porId.has(r.id)) throw new Error(`Conexión de ficha no resuelta: ${r.id}`);
    return Object.freeze({ id:r.id, otroId, titulo:otro.titulo, sale, nombre:r.nombre, explicacion:r.explicacion });
  });
}

export function conexionesFichaHtml(fichas, red, fichaId) {
  const vecinas = conexionesDeFicha(fichas, red, fichaId);
  if (!vecinas.length) return '';
  return `<details class="arch-conexiones-ficha" data-arch-conexiones>
    <summary>Conexiones con otras fichas <span>(${vecinas.length})</span></summary>
    <p class="arch-muted">Relaciones editoriales propuestas. La dirección de la flecha no implica una deducción.</p>
    <div class="arch-conexiones-list">${vecinas.map(v => `<div class="arch-conexion-item">
      <p><small>${v.sale ? 'Desde esta ficha →' : '→ Hacia esta ficha'}</small> <strong>${esc(v.nombre)}</strong></p>
      <p class="arch-conexion-title">${esc(v.titulo)}</p>
      <p class="arch-conexion-exp">${esc(v.explicacion)}</p>
      <div class="arch-conexion-actions">
        <button type="button" data-arch-related-go="${esc(v.otroId)}" data-arch-related-id="${esc(v.id)}">Abrir ficha</button>
        <button type="button" data-arch-related-map="${esc(v.id)}">Ver relación en la red</button>
      </div></div>`).join('')}</div>
  </details>`;
}
