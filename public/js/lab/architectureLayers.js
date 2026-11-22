// N1-U.4 · Dos resoluciones de un mismo grafo hipotético. Datos canónicos solo lectura.
const fail = message => { throw new Error(`Capas del Proemio: ${message}`); };
const clean = value => typeof value === 'string' && !!value.trim();

/**
 * Contracción editorial de N1-U.3: las aristas de capa 1 son proyecciones
 * trazables de relaciones existentes; no se deducen vínculos por proximidad.
 */
export function construirCapasProemio(modelo, grupo, propuesta) {
  if (propuesta?.schema !== 'agora.lab.n1u4.modulos.v1') fail('schema no reconocido');
  if (!modelo?.revision || modelo.revision !== grupo?.revision ||
      propuesta.fuente?.revision !== modelo.revision) fail('revisión distinta');
  if (propuesta.fuente?.unidad_id !== 'proemio' || grupo.unidadId !== 'proemio') fail('unidad distinta de proemio');
  if (propuesta.estado !== 'propuesta_no_validada' || !Array.isArray(propuesta.modulos)) fail('se requieren módulos propuestos');
  const unidad = modelo.unidades.get('proemio');
  if (!unidad) fail('falta unidad canónica');
  const momentos = modelo.momentosPorUnidad.get('proemio') || [];
  const nombres = new Set(), vistos = new Set(), porSub = new Map(), porId = new Map();
  const modulos = propuesta.modulos.map((m, i) => {
    if (!clean(m?.id) || !clean(m.titulo) || !clean(m.funcion) || !clean(m.momento_id) || !Array.isArray(m.sub_ids) || !m.sub_ids.length) fail('módulo incompleto');
    if (porId.has(m.id) || nombres.has(m.titulo)) fail('módulo repetido');
    const momento = momentos.find(x => x.id === m.momento_id && x.origen === 'propuesto');
    if (!momento) fail(`momento propuesto no encontrado: ${m.momento_id}`);
    if (momento.subIds.length !== m.sub_ids.length ||
      momento.subIds.some((sid, j) => sid !== m.sub_ids[j])) fail(`las subunidades de ${m.id} no coinciden con N1-U.2`);
    for (const sid of m.sub_ids) {
      if (vistos.has(sid) || !grupo.subIds.includes(sid)) fail(`subunidad ausente o duplicada: ${sid}`);
      vistos.add(sid); porSub.set(sid, m.id);
    }
    const modulo = Object.freeze({ id: m.id, titulo: m.titulo, funcion: m.funcion,
      momentoId: m.momento_id, subIds: Object.freeze([...m.sub_ids]), orden: i });
    porId.set(m.id, modulo); nombres.add(m.titulo);
    return modulo;
  });
  if (vistos.size !== grupo.subIds.length || modulos.length !== momentos.length) fail('los módulos no cubren los momentos y subunidades del Proemio');

  const pares = new Map(), internas = new Map(modulos.map(m => [m.id, []]));
  for (const r of grupo.relaciones) {
    const origen = porSub.get(r.de), destino = porSub.get(r.a);
    if (!origen || !destino) fail(`la arista ${r.id} no tiene módulos`);
    if (origen === destino) { internas.get(origen).push(r.id); continue; }
    const key = `${origen}->${destino}`;
    if (!pares.has(key)) pares.set(key, { id: key, de: origen, a: destino, relacionIds: [] });
    pares.get(key).relacionIds.push(r.id);
  }
  // Las etiquetas de las aristas se apoyan en los nombres de N1-U.3; no son nuevas inferencias.
  const enlaces = [...pares.values()].map(e => Object.freeze({
    ...e, relacionIds: Object.freeze(e.relacionIds),
    nombre: e.relacionIds.length === 1 ? grupo.porId.get(e.relacionIds[0]).nombre : `${e.relacionIds.length} relaciones propuestas`,
  }));
  return Object.freeze({ revision: modelo.revision, unidadId: 'proemio',
    modulos: Object.freeze(modulos), porId, porSub, enlaces: Object.freeze(enlaces),
    internas, detalle: grupo });
}

export function elementosCapaBasica(capas, seleccion = {}) {
  const nodes = capas.modulos.map((m, i) => ({ group: 'nodes', data: {
    id: `modulo:${m.id}`, key: m.id, tipo: 'modulo_argumentativo',
    label: `${m.id} · ${m.titulo}\n(${m.subIds.length} subunidades)`,
    seleccionado: seleccion.moduloId === m.id ? 1 : 0,
  }, position: { x: 380, y: 125 + i * 190 } }));
  const edges = capas.enlaces.map(e => ({ group: 'edges', data: {
    id: `enlace:${e.id}`, key: e.id, source: `modulo:${e.de}`, target: `modulo:${e.a}`,
    tipo: 'argumentativa_resumida', label: e.nombre,
    seleccionado: seleccion.enlaceId === e.id ? 1 : 0,
  } }));
  return [...nodes, ...edges];
}

export function elementosCapaDetallada(modelo, capas, seleccion = {}) {
  if (modelo.revision !== capas.revision) fail('no se pueden mezclar revisiones');
  const parents = capas.modulos.map(m => ({ group: 'nodes', data: {
    id: `contenedor:${m.id}`, key: m.id, tipo: 'modulo_contenedor',
    label: `${m.id} · ${m.titulo}`, seleccionado: seleccion.moduloId === m.id ? 1 : 0,
  } }));
  const children = capas.modulos.flatMap((m, i) => m.subIds.map((sid, j) => {
    const s = modelo.subs.get(sid);
    if (!s) fail(`subunidad desconocida: ${sid}`);
    return { group: 'nodes', data: {
      id: `sub:${sid}`, key: sid, parent: `contenedor:${m.id}`, tipo: 'subunidad',
      label: `${s.titulo}\n${Array.isArray(s.bekker) ? s.bekker.join('–') : sid}`,
      seleccionado: seleccion.subId === sid ? 1 : 0,
    }, position: { x: 235 + i * 405, y: 145 + j * 151 } };
  }));
  const edges = capas.detalle.relaciones.map(r => ({ group: 'edges', data: {
    id: `rel:${r.id}`, key: r.id, source: `sub:${r.de}`, target: `sub:${r.a}`,
    tipo: 'argumentativa_propuesta', label: r.nombre,
    seleccionado: seleccion.relacionId === r.id ? 1 : 0,
  } }));
  return [...parents, ...children, ...edges];
}
