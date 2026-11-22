// N1-U.5 · Fichas pedagógicas, sin escrituras ni sustitución de las FAQ de MariaDB.
const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const fail = message => { throw new Error(`Fichas explicativas: ${message}`); };

export function construirFichasArquitectura(modelo, capas, recurso) {
  if (recurso?.schema !== 'agora.lab.n1u5.fichas.v1' || recurso.estado !== 'borrador_pedagogico_pendiente_curaduria') fail('esquema o estado incorrectos');
  if (!modelo?.revision || modelo.revision !== capas?.revision || recurso.fuente?.revision !== modelo.revision) fail('revisión editorial distinta');
  if (!Array.isArray(recurso.fichas) || recurso.fichas.length !== 3) fail('se esperaban tres fichas');
  const porId = new Map();
  for (const ficha of recurso.fichas) {
    if (!ficha?.id || porId.has(ficha.id) || !ficha.titulo || !Array.isArray(ficha.introduccion) ||
        !ficha.introduccion.length || !Array.isArray(ficha.lectura_grafo) || !ficha.lectura_grafo.length ||
        !Array.isArray(ficha.referencias) || !ficha.referencias.length || !ficha.nota) fail('ficha incompleta o duplicada');
    if (ficha.tipo === 'proemio') {
      if (ficha.id !== 'proemio' || capas.unidadId !== 'proemio') fail('ficha de Proemio inconsistente');
    } else if (ficha.tipo === 'faq') {
      const src = ficha.fuente_editorial;
      if (src?.faq_id !== ficha.id || src.trayecto_id !== `tr.${ficha.id}` || src.estado_trayecto_en_dump !== 'publicado') fail('identidad editorial de FAQ incorrecta');
      if (!Array.isArray(ficha.pasos) || src.pasos_en_dump !== ficha.pasos.length ||
          !Array.isArray(ficha.transiciones) || ficha.transiciones.length !== ficha.pasos.length - 1) fail('cantidad de pasos o transiciones incorrecta');
      const ids = new Set();
      for (const [index, paso] of ficha.pasos.entries()) {
        if (paso?.id !== `p${index + 1}` || !paso.comentario || ids.has(paso.sub_id) || !modelo.subs.has(paso.sub_id)) fail('paso de FAQ ausente, repetido o fuera de orden');
        ids.add(paso.sub_id);
      }
    } else fail('tipo de ficha desconocido');
    porId.set(ficha.id, Object.freeze(ficha));
  }
  if (![ 'proemio', 'faq.etica.intro', 'faq.agathon.pros_hen' ].every(id => porId.has(id))) fail('faltan fichas previstas');
  return Object.freeze({ revision: modelo.revision, porId, fichas: Object.freeze([...porId.values()]) });
}

export function elementosFichaFAQ(ficha, modelo, seleccion = {}) {
  if (ficha?.tipo !== 'faq') fail('este diagrama requiere una FAQ');
  const nodes = ficha.pasos.map((p, i) => {
    const sub = modelo.subs.get(p.sub_id);
    if (!sub) fail(`pasaje no disponible: ${p.sub_id}`);
    return { group: 'nodes', data: {
      id: `ficha:${ficha.id}:${p.id}`, tipo: 'paso_faq', key: p.id,
      label: `${i + 1}. ${p.titulo || sub.titulo}\n${p.sub_id}`, seleccionado: seleccion.pasoId === p.id ? 1 : 0,
    }, position: { x: Math.floor(i / 2) % 2 === 0 ? (i % 2 === 0 ? 260 : 680) : (i % 2 === 0 ? 680 : 260), y: 130 + Math.floor(i / 2) * 230 } };
  });
  const edges = ficha.transiciones.map((comentario, i) => {
    const a = ficha.pasos[i], b = ficha.pasos[i + 1];
    const id = `${a.id}->${b.id}`;
    return { group: 'edges', data: {
      id: `ficha-enlace:${ficha.id}:${id}`, tipo: 'orden_trayecto', key: id,
      source: `ficha:${ficha.id}:${a.id}`, target: `ficha:${ficha.id}:${b.id}`,
      label: 'paso siguiente', seleccionado: seleccion.enlaceId === id ? 1 : 0,
    } };
  });
  return [...nodes, ...edges];
}

export function fichaIntroHtml(ficha) {
  if (!ficha) return '';
  return `<details class="arch-ficha-intro">
    <summary><span>${safe(ficha.titulo)}</span> <small>Marco explicativo · borrador para curaduría</small></summary>
    <div class="arch-ficha-intro__body">
      <h3>Introducción filosófica</h3>${ficha.introduccion.map(p => `<p>${safe(p)}</p>`).join('')}
      <h3>Cómo leer este diagrama</h3><ol>${ficha.lectura_grafo.map(t => `<li>${safe(t)}</li>`).join('')}</ol>
      <details><summary>Referencias iniciales y estado editorial</summary><ul>${ficha.referencias.map(r => `<li>${safe(r)}</li>`).join('')}</ul><p>${safe(ficha.nota)}</p></details>
    </div>
  </details>`;
}

export function inspectorFichaFAQHtml(ficha, modelo, pasoId, enlaceId) {
  if (ficha?.tipo !== 'faq') return '';
  const paso = ficha.pasos.find(x => x.id === pasoId);
  const indice = ficha.pasos.findIndex(p => `${p.id}->p${Number(p.id.slice(1)) + 1}` === enlaceId);
  const trans = indice >= 0 && indice < ficha.transiciones.length ? ficha.transiciones[indice] : null;
  const titulo = p => p.titulo || modelo.subs.get(p.sub_id)?.titulo || p.sub_id;
  const esBorrador = ficha.fuente_editorial?.origen === 'propuesta_lab';
  const nav = `<div class="arch-nav-list">${ficha.pasos.map((p, i) =>
    `<button type="button" data-arch-card-step="${safe(p.id)}">${i + 1}. ${safe(titulo(p))}<small>${safe(p.sub_id)}</small></button>`).join('')}</div>`;
  const ident = `<div class="arch-inspector-heading"><span class="arch-chip">${esBorrador ? 'FAQ de síntesis · seis pasos propuestos' : 'Trayecto editorial · publicado en exportación'}</span><span class="arch-chip arch-chip--propuesto">Comentario en borrador</span></div>`;
  if (trans) {
    const a = ficha.pasos[indice], b = ficha.pasos[indice + 1];
    return `${ident}<h2>Transición ${indice + 1} → ${indice + 2}</h2>
      <p class="arch-muted">${safe(titulo(a))} → ${safe(titulo(b))}</p><h3>Explicación inicial</h3><p>${safe(trans)}</p>
      <p class="arch-muted">${esBorrador ? 'Esta flecha representa el orden pedagógico propuesto, no un trayecto ya publicado ni una deducción demostrada.' : 'Esta flecha registra el orden del trayecto publicado; su comentario explicativo es una propuesta pedagógica y no una inferencia demostrada.'}</p>
      <button type="button" class="arch-minor" data-arch-card-step="${safe(a.id)}">Inspeccionar el origen</button>
      <button type="button" class="arch-minor" data-arch-card-step="${safe(b.id)}">Inspeccionar el destino</button>
      <button type="button" class="arch-minor" data-arch-card-list>Ver todos los pasos</button>`;
  }
  if (paso) {
    return `${ident}<h2>${safe(titulo(paso))}</h2><p class="arch-muted">Paso ${safe(paso.id)} · ${safe(paso.sub_id)} · ${safe(modelo.subs.get(paso.sub_id)?.titulo || '')}</p>
      <h3>Función de este pasaje</h3><p>${safe(paso.comentario)}</p>
      <h3>Lectura y conexiones</h3><button type="button" class="arch-primary" data-arch-read="${safe(paso.sub_id)}">Leer el pasaje bilingüe</button>
      ${ficha.transiciones.map((c, i) => ({ c, i })).filter(x => x.i === ficha.pasos.indexOf(paso) || x.i + 1 === ficha.pasos.indexOf(paso)).map(x => `<button type="button" class="arch-minor" data-arch-card-link="p${x.i + 1}->p${x.i + 2}">Transición ${x.i + 1} → ${x.i + 2}</button>`).join('')}
      <button type="button" class="arch-minor" data-arch-card-list>Ver todos los pasos</button>`;
  }
  return `${ident}<h2>${safe(ficha.titulo)}</h2><p>${esBorrador
    ? `Este diagrama organiza ${ficha.pasos.length} pasos explicativos propuestos. Sus pasajes de apoyo existen en el corpus, pero la FAQ y el trayecto aún no están publicados en MariaDB.`
    : `Este diagrama reproduce el orden de los ${ficha.pasos.length} pasos del trayecto <code>${safe(ficha.fuente_editorial.trayecto_id)}</code> según la exportación editorial.`}</p>
    <h3>Componentes del grafo</h3>${nav}
    <h3>Relaciones entre los pasos</h3><p class="arch-muted">${ficha.transiciones.length} aristas de secuencia (no deducciones). Seleccioná una flecha para examinar su explicación preliminar.</p>
    <div class="arch-nav-list">${ficha.transiciones.map((_, i) => `<button type="button" data-arch-card-link="p${i + 1}->p${i + 2}">Paso ${i + 1} → ${i + 2}<small>${esBorrador ? 'Orden explicativo propuesto' : 'Orden editorial publicado'}</small></button>`).join('')}</div>`;
}
