// N1-U.2: proyección de lectura para el laboratorio. No muta tags ni produce relaciones filosóficas.
const array = value => Array.isArray(value) ? value : [];
const fail = message => { throw new Error(`Arquitectura del Libro I: ${message}`); };

export function construirModeloArquitectura(lectura, propuesta) {
  if (propuesta?.schema !== 'agora.lab.n1u1.propuestas.v0') fail('esquema de propuestas desconocido.');
  if (!lectura?.revision || !Array.isArray(lectura.tags?.unidades)) fail('la API no devolvió unidades y revisión.');
  if (propuesta.fuente?.revision !== lectura.revision) {
    fail(`las propuestas pertenecen a otra revisión de MariaDB (${String(propuesta.fuente?.revision || 'sin revisión').slice(0, 12)}). Exportá la nueva revisión antes de asociar sus unidades.`);
  }
  const unidades = new Map(), subs = new Map();
  for (const u of lectura.tags.unidades) {
    if (!u?.id || unidades.has(u.id)) fail(`identificador de unidad vacío o duplicado: ${u?.id}`);
    unidades.set(u.id, u);
    for (const s of array(u.subunidades)) {
      if (!s?.id || subs.has(s.id)) fail(`subunidad vacía o duplicada: ${s?.id}`);
      subs.set(s.id, { ...s, unidad: u.id });
    }
  }
  const macros = [], usados = new Set(), momentosPorUnidad = new Map();
  const todasMacros = array(propuesta.macrounidades_propuestas);
  if (todasMacros.length !== 4) fail('se esperaban las cuatro macrounidades propuestas.');
  for (const m of todasMacros) {
    if (!m.id || !Array.isArray(m.unit_ids)) fail('macrounidad sin identificador o unidades.');
    const vinculadas = [];
    for (const id of m.unit_ids) {
      if (!unidades.has(id)) fail(`la unidad ${id} no existe en la revisión indicada.`);
      if (usados.has(id)) fail(`la unidad ${id} aparece en más de una macrounidad.`);
      usados.add(id); vinculadas.push(unidades.get(id));
    }
    macros.push({ ...m, unidades: vinculadas });
  }
  // La hipótesis debe cubrir íntegramente el Libro I, sin sustituir entidades existentes.
  if (usados.size !== unidades.size) fail(`hay unidades sin macrounidad: ${[...unidades.keys()].filter(id => !usados.has(id)).join(', ')}`);
  const propuestasPorUnidad = new Map();
  for (const m of array(propuesta.momentos_propuestos_I_V)) {
    if (!unidades.has(m.unidad_id)) fail(`el momento ${m.id} remite a una unidad inexistente.`);
    if (propuestasPorUnidad.get(m.unidad_id)?.some(x => x.id === m.id)) fail(`momento duplicado: ${m.id}`);
    const items = propuestasPorUnidad.get(m.unidad_id) || [];
    items.push(m); propuestasPorUnidad.set(m.unidad_id, items);
  }
  for (const [uid, u] of unidades) {
    const reales = array(u.articulacion?.momentos);
    const propuestos = propuestasPorUnidad.get(uid) || [];
    if (reales.length && propuestos.length) fail(`la unidad ${uid} tiene momentos canónicos y propuestas paralelas.`);
    const originales = reales.length > 0;
    const momentos = (originales ? reales : propuestos).map((m, i) => ({
      id: originales ? `registrado:${uid}:${m.id}` : m.id,
      orden: m.orden || m.id || String(i + 1), titulo: m.titulo, texto: m.t || m.explicacion || '',
      subIds: originales ? array(m.subs) : array(m.sub_ids), origen: originales ? 'registrado' : 'propuesto',
      unidadId: uid,
    }));
    const vistos = new Set();
    for (const m of momentos) {
      if (!m.id || !m.titulo || !m.subIds.length) fail(`momento incompleto en ${uid}.`);
      for (const sid of m.subIds) {
        if (!subs.has(sid) || subs.get(sid).unidad !== uid) fail(`el momento ${m.id} refiere una subunidad ajena: ${sid}`);
        if (vistos.has(sid)) fail(`la subunidad ${sid} aparece en dos momentos de ${uid}.`);
        vistos.add(sid);
      }
    }
    if (vistos.size !== array(u.subunidades).length) fail(`la articulación de ${uid} no cubre todas sus subunidades.`);
    momentosPorUnidad.set(uid, momentos);
  }
  return {
    revision: lectura.revision, macros, unidades, subs, momentosPorUnidad,
    stats: {
      macrounidades: macros.length, unidades: unidades.size, subunidades: subs.size,
      momentosRegistrados: [...momentosPorUnidad.values()].flat().filter(x => x.origen === 'registrado').length,
      momentosPropuestos: [...momentosPorUnidad.values()].flat().filter(x => x.origen === 'propuesto').length,
    },
  };
}

export function obtenerContexto(modelo, estado) {
  const macro = modelo.macros.find(m => m.id === estado.macroId) || null;
  const unidad = macro?.unidades.find(u => u.id === estado.unidadId) || null;
  const momentos = unidad ? modelo.momentosPorUnidad.get(unidad.id) : [];
  const momento = momentos?.find(m => m.id === estado.momentoId) || null;
  const subunidad = momento?.subIds.includes(estado.subId) ? modelo.subs.get(estado.subId) : null;
  return { macro, unidad, momentos: momentos || [], momento, subunidad };
}

// El resultado contiene solo aristas de secuencia o pertenencia estructural.
// 'orden_textual' no atribuye ninguna implicación o relación argumentativa.
export function elementosArquitectura(modelo, estado) {
  const { macro, unidad, momentos, momento } = obtenerContexto(modelo, estado);
  const nodes = [], edges = [];
  const node = (id, tipo, etiqueta, x, y, extra = {}) => nodes.push({ group: 'nodes', data: { id, tipo, label: etiqueta, ...extra }, position: { x, y } });
  const edge = (id, source, target, tipo, label) => edges.push({ group: 'edges', data: { id, source, target, tipo, label } });
  modelo.macros.forEach((m, i) => node(`macro:${m.id}`, 'macro', `${m.capitulos}\n${m.titulo}`, 110, 100 + 188 * i, { key: m.id, seleccionado: m.id === estado.macroId ? 1 : 0 }));
  if (!macro) {
    for (let i = 0; i < modelo.macros.length - 1; i++) {
      edge(`orden:macro:${i}`, `macro:${modelo.macros[i].id}`, `macro:${modelo.macros[i + 1].id}`, 'orden_textual', 'orden de lectura');
    }
  }
  if (macro) {
    macro.unidades.forEach((u, i) => {
      node(`unidad:${u.id}`, 'unidad', u.titulo, 440, 100 + 170 * i, { key: u.id, seleccionado: u.id === estado.unidadId ? 1 : 0 });
      edge(`contiene:${macro.id}:${u.id}`, `macro:${macro.id}`, `unidad:${u.id}`, 'contiene', 'incluye');
    });
  }
  if (unidad) {
    momentos.forEach((m, i) => {
      node(`momento:${m.id}`, 'momento', `${m.orden} · ${m.titulo}`, 785, 100 + 149 * i,
        { key: m.id, origen: m.origen, seleccionado: m.id === estado.momentoId ? 1 : 0 });
      edge(`articula:${unidad.id}:${m.id}`, `unidad:${unidad.id}`, `momento:${m.id}`,
        'articula', m.origen === 'registrado' ? 'articula · registrado' : 'articula · propuesta');
    });
  }
  if (momento) {
    momento.subIds.forEach((sid, i) => {
      const s = modelo.subs.get(sid);
      node(`sub:${sid}`, 'subunidad', s?.titulo || sid, 1145, 100 + 118 * i,
        { key: sid, seleccionado: sid === estado.subId ? 1 : 0 });
      edge(`contiene:${momento.id}:${sid}`, `momento:${momento.id}`, `sub:${sid}`, 'contiene', 'incluye');
    });
  }
  return [...nodes, ...edges];
}
