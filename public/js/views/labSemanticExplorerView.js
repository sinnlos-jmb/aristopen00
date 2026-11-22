import { esc } from '../ui.js';
import { buildSemanticProjection, buscarNodosSemanticos, explorarVecindad, exportarRelateCypher, sugerirConceptosSemanticos } from '../lab/semanticProjection.js';

const downloadText = (contenido, nombre, mime = 'text/plain;charset=utf-8') => {
  const blob = new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Una visualización pequeña, dirigida y puramente documental.
// No representa conexiones inferidas ni altera el modelo.
function vistaRadial(graph, vicinity) {
  const center = { x: 320, y: 185 };
  const direct = vicinity.aristas.filter(e => e.desde === vicinity.foco || e.hacia === vicinity.foco);
  const ids = [...new Set(direct.map(e => e.desde === vicinity.foco ? e.hacia : e.desde))].slice(0, 10);
  if (!ids.length) return '<p class="hint">Sin aristas directas en la proyección disponible.</p>';
  const index = new Map(graph.nodes.map(n => [n.uid, n]));
  const coords = new Map(ids.map((id, i) => {
    const a = 2 * Math.PI * i / ids.length - Math.PI / 2;
    return [id, { x: center.x + 235 * Math.cos(a), y: center.y + 133 * Math.sin(a) }];
  }));
  const lines = direct.filter(e => coords.has(e.desde === vicinity.foco ? e.hacia : e.desde))
    .slice(0, 36).map(e => {
      const outward = e.desde === vicinity.foco;
      const p = coords.get(outward ? e.hacia : e.desde);
      const dx = p.x - center.x, dy = p.y - center.y, d = Math.hypot(dx, dy);
      const sx = center.x + dx / d * 37, sy = center.y + dy / d * 23;
      const ex = p.x - dx / d * 38, ey = p.y - dy / d * 24;
      const x1 = outward ? sx : ex, y1 = outward ? sy : ey;
      const x2 = outward ? ex : sx, y2 = outward ? ey : sy;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-opacity="0.44" stroke-width="1.6" marker-end="url(#agora-sem-arrow)"><title>${esc(e.tipo)} · ${esc(e.relacion || e.fuente)}</title></line>`;
    }).join('');
  const labels = [...coords].map(([id, p]) => {
    const n = index.get(id);
    const label = n?.etiqueta || id;
    return `<g><title>${esc(label)} · ${esc(n?.tipo || '')}</title><rect x="${p.x-47}" y="${p.y-22}" width="94" height="44" rx="8" fill="var(--surface, #ece8e1)" stroke="currentColor" stroke-opacity=".24"/><text x="${p.x}" y="${p.y+4}" text-anchor="middle" font-size="11" fill="currentColor">${esc(label.length > 15 ? label.slice(0, 14) + '…' : label)}</text></g>`;
  }).join('');
  const focus = index.get(vicinity.foco);
  return `<div class="lab-semantic-svg-scroll"><svg class="lab-semantic-svg" viewBox="0 0 640 370" role="img" aria-label="Vecinos directos de ${esc(focus?.etiqueta || vicinity.foco)}; las flechas indican dirección de aristas">
    <defs><marker id="agora-sem-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" fill="currentColor"/></marker></defs>
    ${lines}${labels}
    <rect x="270" y="159" width="100" height="52" rx="10" fill="var(--gold, #a78a50)" fill-opacity=".15" stroke="currentColor" stroke-width="1.7"/>
    <text x="320" y="181" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">${esc((focus?.etiqueta || '').slice(0, 15))}</text>
    <text x="320" y="197" text-anchor="middle" font-size="9" fill="currentColor">foco</text>
  </svg></div>`;
}

// Laboratorio separado del Orientador: ninguna consulta edita grafos ni MariaDB.
export function createLabSemanticExplorerView(App = null) {
  const el = document.createElement('div');
  el.className = 'view-lab scrollable has-scroll';
  const graph = buildSemanticProjection(App?.S || {});
  let foco = graph.nodes.find(n => n.uid === 'concepto_estatico:phusis')?.uid || graph.nodes[0]?.uid || null;
  let search = '';
  let hops = 1;
  let message = '';
  const index = new Map(graph.nodes.map(n => [n.uid, n]));
  const label = id => index.get(id)?.etiqueta || id;
  const types = graph.stats.porTipo;
  const rels = graph.stats.porRelacion;

  function render() {
    const resultados = buscarNodosSemanticos(graph, search, 18);
    const vec = foco ? explorarVecindad(graph, foco, { saltos: hops }) : null;
    const edges = vec?.aristas || [];
    const sugerencias = foco ? sugerirConceptosSemanticos(graph, foco, 8) : [];
    el.innerHTML = `<div class="lab__inner">
      <nav class="lab-nav"><a class="btn btn--ghost btn--sm" href="#/lab">← Laboratorio</a></nav>
      <header class="lab-exp__header"><h1 class="lab-exp__title">Explorador semántico · Experimento 5</h1></header>
      <section class="lab-card" id="lab-semantic-explorer">
        <h2>Una proyección documental del corpus</h2>
        <p class="hint">Exploración experimental de los árboles, el grafo funcional, los tags y las FAQ. Las relaciones se conservan con su dirección y fuente. No se infiere identidad ni respaldo textual a partir de una vecindad.</p>
        <div class="lab-panel"><h3>Inventario del grafo</h3>
          <p><strong>${graph.stats.nodos}</strong> nodos · <strong>${graph.stats.aristas}</strong> vínculos · <strong>${graph.stats.incidencias}</strong> incidencias de referencias</p>
          <p class="hint">Versión corpus: ${esc(graph.versionCorpus)} · Clases: ${Object.entries(types).map(([k,v]) => `${esc(k)} (${v})`).join(' · ') || '—'}</p>
          <p class="hint">Relaciones: ${Object.entries(rels).map(([k,v]) => `${esc(k)} (${v})`).join(' · ') || '—'}</p>
          <div class="lab-toolbar"><button type="button" class="lab-btn lab-btn--ghost" id="sem-export-json">Exportar proyección JSON</button><button type="button" class="lab-btn lab-btn--ghost" id="sem-export-cypher">Exportar importación Cypher</button></div>
          <p class="hint">Cypher se importa en Relate por separado. Este experimento funciona sin Relate instalado.</p>
        </div>
        <div class="lab-panel">
          <h3>Buscar concepto o elemento</h3>
          <form id="sem-search-form" class="lab-form">
            <label for="sem-search">Etiqueta, identificador o término griego</label>
            <input class="lab-input" id="sem-search" type="search" maxlength="200" value="${esc(search)}" placeholder="Ej.: phusis, virtud, felicidad" />
            <button class="lab-btn" type="submit">Buscar</button>
          </form>
          <div id="sem-results" class="lab-help">${resultados.map(n => `<button type="button" class="lab-help__item" data-sem-focus="${esc(n.uid)}">${esc(n.etiqueta)} <small>· ${esc(n.uid)} · ${esc(n.fuente)}</small></button>`).join('') || (search ? '<p class="hint">No se encontraron nodos con ese término.</p>' : '')}</div>
          <p class="hint">Ejemplos: <button type="button" class="btn btn--ghost btn--sm" data-sem-query="phusis">phýsis</button> <button type="button" class="btn btn--ghost btn--sm" data-sem-query="arete">areté</button> <button type="button" class="btn btn--ghost btn--sm" data-sem-query="eudaimonia">eudaimonía</button></p>
        </div>
        ${vec ? `<div class="lab-panel">
          <h3>Vecindad de ${esc(label(foco))}</h3>
          <p class="hint">Nodo: ${esc(foco)} · Clase: ${esc(index.get(foco)?.tipo)} · Fuente: ${esc(index.get(foco)?.fuente)}</p>
          <label for="sem-hops">Profundidad exploratoria</label>
          <select class="lab-input" id="sem-hops"><option value="1" ${hops === 1 ? 'selected' : ''}>1 salto</option><option value="2" ${hops === 2 ? 'selected' : ''}>2 saltos</option></select>
          ${vistaRadial(graph, vec)}
          <p class="hint">Esquema: muestra hasta 10 vecinos directos. El listado siguiente conserva más relaciones y sus fuentes. Recorrer en ambos sentidos para descubrir nodos NO invierte filosóficamente las aristas.</p>
          <p>${vec.nodos.length} nodos visibles · ${edges.length} vínculos${vec.truncado ? ' · resultado limitado por seguridad' : ''}</p>
          <div class="lab-help">${vec.nodos.filter(n => n.uid !== foco).slice(0, 24).map(n => `<button class="lab-help__item" type="button" data-sem-focus="${esc(n.uid)}">${esc(n.etiqueta)} <small>· distancia ${n.profundidad} · ${esc(n.tipo)}</small></button>`).join('')}</div>
          <h3>Conceptos para explorar a continuación</h3>
          <p class="hint">Estas sugerencias muestran caminos de procedencia de hasta 2 vínculos. Son opciones de investigación, NO respuestas ni relaciones filosóficas validadas; las asociaciones por tags se identifican aparte.</p>
          <div class="lab-help">${sugerencias.map(s => `<button type="button" class="lab-help__item" data-sem-focus="${esc(s.uid)}">${esc(s.etiqueta)} <small>· ${esc(s.base)} · vía ${esc(s.recorrido.map(e => e.tipo + (e.recorridoEnSentidoOriginal ? ' →' : ' ←')).join(' / '))}</small></button>`).join('') || '<p class="hint">No hay conceptos candidatos en un radio de dos vínculos.</p>'}</div>
          <h3>Relaciones y procedencia</h3>
          <div class="lab-semantic-table-scroll"><table class="lab-table lab-semantic-table"><thead><tr><th>Desde → hacia</th><th>Tipo / relación</th><th>Fuente</th><th>Ref. / voz / sentido</th></tr></thead>
            <tbody>${edges.map(e => `<tr><td>${esc(label(e.desde))} → ${esc(label(e.hacia))}</td><td>${esc(e.tipo)}${e.relacion ? ` · ${esc(e.relacion)}` : ''}</td><td>${esc(e.fuente)}</td><td>${esc([e.referencia, e.voz, e.sentidoReferido, e.rol].filter(Boolean).join(' · ') || '—')}</td></tr>`).join('') || '<tr><td colspan="4">Sin aristas documentadas.</td></tr>'}</tbody></table></div>
          <div class="lab-toolbar"><button type="button" class="lab-btn lab-btn--ghost" id="sem-export-selection">Exportar vecindad JSON</button></div>
        </div>` : '<p class="lab-panel">No se encontraron nodos en el corpus cargado.</p>'}
        <details class="lab-panel"><summary>Diagnóstico de referencias no resueltas (${graph.issues.length})</summary>
          <p class="hint">Una incidencia se declara; nunca se completa una arista inventando un nodo o un pasaje.</p>
          <pre class="lab-json">${esc(JSON.stringify(graph.issues.slice(0, 120), null, 2))}</pre>
          ${graph.issues.length > 120 ? '<p class="hint">Mostrando solo 120 incidencias; exportá el JSON para ver todas.</p>' : ''}
        </details>
        <p id="sem-status" role="status">${esc(message)}</p>
      </section></div>`;
    bind();
  }
  function bind() {
    el.querySelector('#sem-search-form')?.addEventListener('submit', e => {
      e.preventDefault(); search = el.querySelector('#sem-search').value.trim(); render();
    });
    el.querySelectorAll('[data-sem-query]').forEach(b => b.addEventListener('click', () => {
      search = b.dataset.semQuery; render();
    }));
    el.querySelectorAll('[data-sem-focus]').forEach(b => b.addEventListener('click', () => {
      foco = b.dataset.semFocus; search = ''; render();
    }));
    el.querySelector('#sem-hops')?.addEventListener('change', e => { hops = Number(e.target.value); render(); });
    el.querySelector('#sem-export-json')?.addEventListener('click', () => downloadText(
      JSON.stringify(graph, null, 2), 'agora-proyeccion-semantica-v1.json', 'application/json;charset=utf-8'));
    el.querySelector('#sem-export-cypher')?.addEventListener('click', () => downloadText(
      exportarRelateCypher(graph), 'agora-relate-import.cypher'));
    el.querySelector('#sem-export-selection')?.addEventListener('click', () => downloadText(
      JSON.stringify(explorarVecindad(graph, foco, { saltos: hops }), null, 2),
      'agora-vecindad-semantica.json', 'application/json;charset=utf-8'));
  }
  render();
  return { el, destroy() { foco = null; } };
}
